const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const PaymentPlanModel = require('../models/PaymentPlanModel');
const UserModel = require('../models/UserModel');
const cashfree = require('../services/cashfreeService');
const config = require('../config/env');
const { notifyPaid } = require('../services/paymentNotify');
const { streamStatementPdf } = require('../services/invoiceService');

async function assertOwner(req, propertyId) {
  if (!(await PaymentPlanModel.userOwnsProperty(req.user.sub, Number(propertyId)))) {
    throw new AppError('Property not found', 404);
  }
}

// GET /api/payment-plan/my
exports.myProperties = asyncHandler(async (req, res) => {
  return success(res, await PaymentPlanModel.listMyProperties(req.user.sub));
});

// GET /api/payment-plan/property/:propertyId/schedule
exports.schedule = asyncHandler(async (req, res) => {
  await assertOwner(req, req.params.propertyId);
  return success(res, await PaymentPlanModel.getSchedule(req.params.propertyId));
});

// GET /api/payment-plan/property/:propertyId/history
exports.history = asyncHandler(async (req, res) => {
  await assertOwner(req, req.params.propertyId);
  return success(res, await PaymentPlanModel.getHistory(req.params.propertyId, {
    search: req.query.search, method: req.query.method,
  }));
});

// GET /api/payment-plan/property/:propertyId/ledger
exports.ledger = asyncHandler(async (req, res) => {
  await assertOwner(req, req.params.propertyId);
  const ctx = await PaymentPlanModel.getContext(req.params.propertyId);
  const ledger = await PaymentPlanModel.getLedger(req.params.propertyId);
  return success(res, {
    property: { id: ctx.propertyId, label: ctx.label, flatNo: ctx.flatNo, projectName: ctx.projectName },
    ...ledger,
  });
});

// GET /api/payment-plan/property/:propertyId/statement.pdf  (token via header or ?token=)
exports.statement = asyncHandler(async (req, res) => {
  await assertOwner(req, req.params.propertyId);
  await streamStatementPdf(res, req.params.propertyId);
});

// POST /api/payment-plan/installment/:installmentId/initiate  (online — Cashfree)
exports.initiate = asyncHandler(async (req, res) => {
  const inst = await PaymentPlanModel.getInstallmentById(req.params.installmentId);
  if (!inst) throw new AppError('Installment not found', 404);
  await assertOwner(req, inst.property_id);
  if (inst.is_paid) throw new AppError('This installment is already paid', 409);

  const amount = Number(inst.amount) + Number(inst.late_fee || 0);
  const user = await UserModel.findById(req.user.sub);
  const orderId = `YIP-${inst.property_id}-${inst.id}-${Date.now()}`;
  const returnUrl = `${config.app.baseUrl}/api/payment/return?order_id={order_id}`;
  const notifyUrl = `${config.app.baseUrl}/api/payment/webhook`;

  let environment = config.cashfree.env;
  let paymentSessionId = null;
  let paymentLink = null;
  let cashfreeOrderId = null;

  if (config.cashfree.appId && config.cashfree.secretKey) {
    try {
      const order = await cashfree.createOrder({
        orderId, amount,
        customer: { id: user.id, phone: user.mobile, name: user.name, email: user.email },
        returnUrl, notifyUrl, note: inst.label,
      });
      cashfreeOrderId = order.cashfreeOrderId;
      paymentSessionId = order.paymentSessionId;
      paymentLink = order.paymentLink;
    } catch (e) {
      throw new AppError(`Cashfree order failed: ${e.message}`, 502);
    }
  } else {
    environment = 'sandbox';
    paymentLink = `${config.app.baseUrl}/api/payment/sandbox-checkout?order_id=${orderId}`;
    paymentSessionId = `DEV-SESSION-${orderId}`;
  }

  await PaymentPlanModel.createOrder({
    propertyId: inst.property_id, installmentId: inst.id, userId: req.user.sub,
    orderId, cashfreeOrderId, paymentSessionId, paymentLink, amount,
  });

  return success(res, {
    orderId, paymentSessionId, paymentLink, amount, currency: 'INR', status: 'created', environment,
  }, 'Payment order created');
});

// POST /api/payment-plan/verify  { orderId }
exports.verify = asyncHandler(async (req, res) => {
  const order = await PaymentPlanModel.findOrder(req.body.orderId);
  if (!order) throw new AppError('Order not found', 404);
  if (order.user_id !== req.user.sub) throw new AppError('Not your order', 403);

  let cfStatus = 'PAID';
  if (config.cashfree.appId && config.cashfree.secretKey && order.cashfree_order_id) {
    try {
      const raw = await cashfree.fetchOrder(order.order_id);
      cfStatus = raw?.order_status || 'CREATED';
    } catch (e) {
      throw new AppError(`Could not verify with Cashfree: ${e.message}`, 502);
    }
  }
  const status = cashfree.mapOrderStatus(cfStatus);
  await PaymentPlanModel.setOrderStatus(order.order_id, status);

  if (status === 'paid' && order.installment_id) {
    const already = await PaymentPlanModel.getInstallmentById(order.installment_id);
    if (already && !already.is_paid) {
      await PaymentPlanModel.markPaid(order.installment_id, {
        method: 'Cashfree', source: 'online', txnId: order.order_id, recordedBy: 'app',
        amount: Number(order.amount),
      });
      const ctx = await PaymentPlanModel.getContext(order.property_id);
      await notifyPaid(ctx, {
        label: already.label, amount: Number(already.amount), paidAmount: Number(order.amount),
        txnId: order.order_id,
      }, { source: 'online' });
    }
  }

  return success(res, { orderId: order.order_id, status },
    status === 'paid' ? 'Payment verified' : 'Payment not yet paid');
});

module.exports = exports;
