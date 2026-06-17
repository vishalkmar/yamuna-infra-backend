const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const PaymentModel = require('../models/PaymentModel');
const BookingModel = require('../models/BookingModel');
const UserModel = require('../models/UserModel');
const cashfree = require('../services/cashfreeService');
const paymentService = require('../services/paymentService');
const config = require('../config/env');

// ---------------------------------------------------------------------------
// GET /payment/schedule/:bookingId
// ---------------------------------------------------------------------------
exports.getSchedule = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  // Auto-flip due → overdue + apply late fees if any.
  await paymentService.reconcileOverdueForBooking(bookingId);

  const [installments, nextDue, outstanding] = await Promise.all([
    PaymentModel.getSchedule(bookingId),
    PaymentModel.getNextDue(bookingId),
    PaymentModel.getOutstanding(bookingId),
  ]);

  return success(res, {
    nextDue,
    installments,
    outstanding: Number(outstanding.outstanding),
    pendingCount: Number(outstanding.pendingCount),
  });
});

// ---------------------------------------------------------------------------
// GET /payment/history/:bookingId  (supports ?search= &method= &limit=)
// ---------------------------------------------------------------------------
exports.getHistory = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { search, method, limit } = req.query;
  const history = await PaymentModel.getHistory(bookingId, {
    search: search ? String(search) : undefined,
    method: method ? String(method) : undefined,
    limit: limit ? Number(limit) : undefined,
  });
  return success(res, history);
});

// ---------------------------------------------------------------------------
// GET /payment/ledger/:bookingId
// ---------------------------------------------------------------------------
exports.getLedger = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const ledger = await PaymentModel.getLedger(bookingId);
  const booking = await BookingModel.findById(bookingId);
  return success(res, {
    booking: {
      bookingId: booking?.bookingId,
      unitNumber: booking?.unitNumber,
      projectName: booking?.projectName,
      allotteeNames: booking?.allotteeNames,
    },
    ...ledger,
  });
});

// ---------------------------------------------------------------------------
// POST /payment/initiate
// Body: { bookingId, installmentId, amount, mode, remarks }
// Creates a Cashfree order. Returns the data needed by the mobile app to
// open the hosted-checkout (WebView) or the native SDK.
// ---------------------------------------------------------------------------
exports.initiate = asyncHandler(async (req, res) => {
  const { bookingId, installmentId, amount, mode, remarks } = req.body;

  // Validate against the actual installment so a client can't initiate
  // a payment for some other amount.
  const inst = await PaymentModel.getInstallmentById(bookingId, installmentId);
  if (!inst) throw new AppError('Installment not found for this booking', 404);
  if (inst.status === 'paid') throw new AppError('This installment is already paid', 409);

  const totalDue = Number(inst.amount) + Number(inst.lateFee || 0);
  if (Number(amount) > totalDue) {
    throw new AppError(
      `Amount exceeds outstanding for this installment (₹${totalDue.toLocaleString('en-IN')})`,
      400,
    );
  }

  const user = await UserModel.findById(req.user.sub);
  const orderId = `YI-${bookingId}-${inst.id}-${Date.now()}`;
  const returnUrl = `${config.app.baseUrl}/api/payment/return?order_id={order_id}`;
  const notifyUrl = `${config.app.baseUrl}/api/payment/webhook`;

  let cashfreeOrder = null;
  let environment = config.cashfree.env;
  let initialStatus = 'created';
  let paymentLink = null;
  let paymentSessionId = null;
  let cashfreeOrderId = null;

  // If Cashfree creds aren't configured, fall back to a DEV stub so the
  // app can still demo the full flow end-to-end.
  if (config.cashfree.appId && config.cashfree.secretKey) {
    try {
      cashfreeOrder = await cashfree.createOrder({
        orderId,
        amount: Number(amount),
        customer: {
          id: user.id,
          phone: user.mobile,
          name: user.name,
          email: user.email,
        },
        returnUrl,
        notifyUrl,
        note: remarks,
      });
      cashfreeOrderId = cashfreeOrder.cashfreeOrderId;
      paymentSessionId = cashfreeOrder.paymentSessionId;
      paymentLink = cashfreeOrder.paymentLink;
    } catch (e) {
      throw new AppError(`Cashfree order failed: ${e.message}`, 502, e.cashfreeBody);
    }
  } else {
    environment = 'sandbox';
    initialStatus = 'created';
    // Dev stub: a deterministic placeholder URL the mobile app can recognise
    paymentLink = `${config.app.baseUrl}/api/payment/sandbox-checkout?order_id=${orderId}`;
    paymentSessionId = `DEV-SESSION-${orderId}`;
  }

  const rowId = await PaymentModel.createOrder({
    bookingCode: bookingId,
    userId: req.user.sub,
    installmentId: inst.id,
    orderId,
    amount,
    mode,
    remarks,
    environment,
    cashfreeOrderId,
    paymentSessionId,
    paymentLink,
    rawResponse: cashfreeOrder?.raw,
  });

  return success(res, {
    id: rowId,
    orderId,
    cashfreeOrderId,
    paymentSessionId,
    paymentLink,
    amount: Number(amount),
    currency: 'INR',
    status: initialStatus,
    environment,
  }, 'Payment order created');
});

// ---------------------------------------------------------------------------
// POST /payment/verify  — manual verify (also fallback after WebView return)
// Body: { orderId }
// Hits Cashfree to re-fetch the order status; if PAID, records the payment.
// ---------------------------------------------------------------------------
exports.verify = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  const order = await PaymentModel.findOrderByOrderId(orderId);
  if (!order) throw new AppError('Order not found', 404);
  if (order.user_id !== req.user.sub) throw new AppError('Not your order', 403);

  // If we have real Cashfree creds, query the gateway. Otherwise (dev),
  // mark the order paid so the UI flow can be exercised.
  let cashfreeStatus = 'PAID';
  let raw = null;
  if (config.cashfree.appId && config.cashfree.secretKey && order.cashfree_order_id) {
    try {
      raw = await cashfree.fetchOrder(order.order_id);
      cashfreeStatus = raw?.order_status || 'CREATED';
    } catch (e) {
      throw new AppError(`Could not verify with Cashfree: ${e.message}`, 502);
    }
  }

  const status = cashfree.mapOrderStatus(cashfreeStatus);
  await PaymentModel.updateOrderStatus({
    orderId: order.order_id,
    status,
    gatewayTxnId: raw?.cf_order_id || order.gateway_txn_id || null,
    failureReason: status === 'failed' ? raw?.order_note || 'declined' : null,
    rawResponse: raw,
  });

  let paymentId = null;
  let receiptCode = null;
  if (status === 'paid') {
    paymentId = await PaymentModel.recordPayment({
      bookingPk: order.booking_pk,
      installmentId: order.installment_id,
      txnId: order.order_id,
      cashfreeOrderId: order.cashfree_order_id,
      amount: order.amount,
      method: order.mode || 'Cashfree',
      remarks: order.remarks,
    });
    const user = await UserModel.findById(order.user_id);
    receiptCode = await PaymentModel.generateReceipt({
      paymentId,
      email: user?.email,
      whatsapp: user?.mobile,
    });
  }

  return success(res, {
    orderId: order.order_id,
    status,
    paymentId,
    receiptCode,
  }, status === 'paid' ? 'Payment verified' : 'Payment not yet paid');
});

// ---------------------------------------------------------------------------
// POST /payment/webhook  — Cashfree dispatch
// Signature: x-webhook-signature, timestamp: x-webhook-timestamp
// Must use raw body for HMAC verification.
// ---------------------------------------------------------------------------
exports.webhook = asyncHandler(async (req, res) => {
  const timestamp = req.headers['x-webhook-timestamp'];
  const signature = req.headers['x-webhook-signature'];
  const rawBody = req.rawBody || JSON.stringify(req.body);

  const signatureValid = cashfree.verifyWebhookSignature({
    timestamp, rawBody, signature,
  });

  const payload = req.body;
  const eventType = payload?.type || 'UNKNOWN';
  const cashfreeOrderId = payload?.data?.order?.order_id
    || payload?.data?.payment?.cf_order_id
    || null;

  // Always log the event (even invalid signature) for audit
  let processError = null;

  if (!signatureValid) {
    processError = 'invalid signature';
  } else {
    try {
      // Cashfree events: PAYMENT_SUCCESS_WEBHOOK, PAYMENT_FAILED_WEBHOOK, etc.
      const orderId = payload?.data?.order?.order_id;
      if (orderId) {
        const order = await PaymentModel.findOrderByOrderId(orderId);
        if (order) {
          const status = cashfree.mapOrderStatus(payload?.data?.order?.order_status);
          await PaymentModel.updateOrderStatus({
            orderId,
            status,
            gatewayTxnId: payload?.data?.payment?.cf_payment_id || null,
            failureReason: payload?.data?.payment?.payment_message || null,
            rawResponse: payload,
          });
          if (status === 'paid') {
            await PaymentModel.recordPayment({
              bookingPk: order.booking_pk,
              installmentId: order.installment_id,
              txnId: orderId,
              cashfreeOrderId: payload?.data?.payment?.cf_payment_id || order.cashfree_order_id,
              amount: order.amount,
              method: payload?.data?.payment?.payment_group || order.mode || 'Cashfree',
              remarks: order.remarks,
            });
          }
        }
      }
    } catch (e) {
      processError = e.message;
    }
  }

  await PaymentModel.logWebhookEvent({
    eventType,
    cashfreeOrderId,
    signatureValid,
    payload,
    processError,
  });

  // Cashfree expects 200 OK quickly. If signature invalid we still 200
  // to avoid retry storms but log it.
  return success(res, { received: true, signatureValid });
});

// ---------------------------------------------------------------------------
// Dev-only helpers
// ---------------------------------------------------------------------------

// GET /payment/sandbox-checkout — a tiny inline "fake checkout" page so the
// WebView flow is demoable when no real Cashfree creds are configured.
exports.sandboxCheckout = (req, res) => {
  const { order_id: orderId } = req.query;
  const successUrl = `${config.app.baseUrl}/api/payment/return?order_id=${orderId}&status=PAID`;
  const cancelUrl = `${config.app.baseUrl}/api/payment/return?order_id=${orderId}&status=CANCELLED`;
  res.set('Content-Type', 'text/html');
  res.send(`<!doctype html><html><body style="font-family:system-ui;padding:24px;background:#f7f8fb;">
    <h2 style="color:#2E4374;">Sandbox Checkout</h2>
    <p style="color:#6B7280;">Order <code>${orderId}</code></p>
    <p>No Cashfree credentials configured — this is a dev stub.</p>
    <div style="margin-top:24px;display:flex;gap:12px;">
      <a href="${successUrl}" style="background:#22C55E;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Simulate Success</a>
      <a href="${cancelUrl}" style="background:#EF4444;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Simulate Cancel</a>
    </div>
  </body></html>`);
};

// GET /payment/return — handles the WebView return URL Cashfree (or the
// sandbox stub) redirects to. The mobile app intercepts this URL.
exports.returnHandler = (req, res) => {
  const { order_id: orderId, status } = req.query;
  res.set('Content-Type', 'text/html');
  res.send(`<!doctype html><html><body style="font-family:system-ui;padding:24px;text-align:center;">
    <h3>Returning to app…</h3>
    <p>Order: <code>${orderId}</code></p>
    <p>Status: <strong>${status || 'CHECK'}</strong></p>
    <script>
      // Mobile app intercepts /api/payment/return via WebView onNavigationStateChange.
      // For dev browsers this script just shows a message.
    </script>
  </body></html>`);
};
