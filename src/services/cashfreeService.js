// Cashfree Payment Gateway (PG v3) — REST integration.
// Docs: https://docs.cashfree.com/reference/pgnewcreateorder
//
// We avoid the official SDK so this module has zero native deps and is easy
// to unit-test. Exports are kept side-effect free.

const crypto = require('crypto');
const config = require('../config/env');

const cfg = config.cashfree;

function authHeaders() {
  if (!cfg.appId || !cfg.secretKey) {
    throw new Error('Cashfree credentials not configured. Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY in .env');
  }
  return {
    'x-client-id': cfg.appId,
    'x-client-secret': cfg.secretKey,
    'x-api-version': cfg.apiVersion,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

// ---------------------------------------------------------------------------
// Create order
// ---------------------------------------------------------------------------

async function createOrder({ orderId, amount, currency = 'INR', customer, returnUrl, notifyUrl, note }) {
  if (!customer?.id || !customer?.phone) {
    throw new Error('Cashfree createOrder: customer.id and customer.phone are required');
  }

  const body = {
    order_id: orderId,
    order_amount: Number(amount.toFixed ? amount.toFixed(2) : amount),
    order_currency: currency,
    customer_details: {
      customer_id: String(customer.id),
      customer_phone: customer.phone,
      customer_name: customer.name || undefined,
      customer_email: customer.email || undefined,
    },
    order_meta: {
      return_url: returnUrl,
      notify_url: notifyUrl,
    },
    order_note: note || undefined,
  };

  const res = await fetch(`${cfg.apiBase}/orders`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = data?.message || data?.error_description || `Cashfree HTTP ${res.status}`;
    const err = new Error(message);
    err.statusCode = res.status;
    err.cashfreeBody = data;
    throw err;
  }

  return {
    cashfreeOrderId: data.cf_order_id ? String(data.cf_order_id) : null,
    paymentSessionId: data.payment_session_id,
    orderStatus: data.order_status,
    paymentLink: data.payments?.url || data.payment_link || null,
    raw: data,
  };
}

// ---------------------------------------------------------------------------
// Fetch order status (used as a defensive sync after WebView return)
// ---------------------------------------------------------------------------

async function fetchOrder(orderId) {
  const res = await fetch(`${cfg.apiBase}/orders/${encodeURIComponent(orderId)}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || `Cashfree fetchOrder HTTP ${res.status}`);
    err.statusCode = res.status;
    err.cashfreeBody = data;
    throw err;
  }
  return data;
}

// ---------------------------------------------------------------------------
// Webhook signature verification
//
// Cashfree signs every webhook as:
//   base64( hmac_sha256( secret, timestamp + raw_body ) )
//
// Header names:
//   x-webhook-signature        — the signature
//   x-webhook-timestamp        — the timestamp
//   x-webhook-version          — payload schema version
//
// `rawBody` must be the exact bytes received (Express raw body buffer),
// NOT the parsed JSON.
// ---------------------------------------------------------------------------

function verifyWebhookSignature({ timestamp, rawBody, signature, secret }) {
  if (!timestamp || !rawBody || !signature) return false;
  const key = secret || cfg.webhookSecret;
  if (!key) return false;

  const payload = timestamp + (Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody));
  const expected = crypto.createHmac('sha256', key).update(payload).digest('base64');

  // constant-time compare
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// Map Cashfree statuses → our internal payment_orders status enum
// ---------------------------------------------------------------------------

function mapOrderStatus(cashfreeStatus) {
  switch (String(cashfreeStatus || '').toUpperCase()) {
    case 'PAID':
      return 'paid';
    case 'ACTIVE':
    case 'CREATED':
      return 'created';
    case 'EXPIRED':
      return 'cancelled';
    case 'FAILED':
    case 'TERMINATED':
    case 'TERMINATION_REQUESTED':
      return 'failed';
    default:
      return 'created';
  }
}

module.exports = {
  createOrder,
  fetchOrder,
  verifyWebhookSignature,
  mapOrderStatus,
};
