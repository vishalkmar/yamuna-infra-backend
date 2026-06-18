const config = require('../config/env');

// Parse EMAIL_FROM ("Name <email>" or "email") into Brevo's sender shape.
function parseSender() {
  const raw = (config.email.from || '').trim();
  const m = raw.match(/^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/);
  if (m) return { name: (m[1] || 'Shri Yamuna Infra').replace(/^"|"$/g, '').trim(), email: m[2].trim() };
  return { name: 'Shri Yamuna Infra', email: raw };
}

// ---------- Brevo (Sendinblue) HTTP API — port 443, works on Render ----------
async function sendViaBrevo(to, subject, text, html) {
  const sender = parseSender();
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': config.brevo.apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender,
      to: [{ email: to }],
      subject,
      htmlContent: html || `<pre style="font:14px sans-serif">${text || ''}</pre>`,
      textContent: text || undefined,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return { delivered: false, reason: `brevo_${res.status}: ${body.slice(0, 300)}` };
  }
  const data = await res.json().catch(() => ({}));
  return { delivered: true, messageId: data.messageId || 'brevo' };
}

// ---------- SMTP fallback (only if Brevo not configured) ----------
let _transport = null;
async function smtpTransport() {
  if (_transport) return _transport;
  if (!config.smtp.host || !config.smtp.user) return null;
  // eslint-disable-next-line global-require
  const nodemailer = require('nodemailer');
  const dns = require('dns').promises;
  let host = config.smtp.host;
  const tls = { rejectUnauthorized: false };
  try {
    const { address } = await dns.lookup(config.smtp.host, { family: 4 });
    host = address; tls.servername = config.smtp.host;
  } catch (_) { /* fall back to hostname */ }
  _transport = nodemailer.createTransport({
    host, port: config.smtp.port, secure: config.smtp.secure,
    auth: { user: config.smtp.user, pass: config.smtp.pass },
    requireTLS: !config.smtp.secure, family: 4,
    connectionTimeout: 20000, greetingTimeout: 20000, socketTimeout: 25000, tls,
  });
  return _transport;
}

// Send one email. Uses Brevo HTTP API when BREVO_API_KEY is set (recommended on
// Render/cPanel which block outbound SMTP); otherwise falls back to SMTP.
// Resolves { delivered, ... }; never throws.
async function sendEmail(to, subject, text, html) {
  try {
    if (config.brevo.apiKey) {
      return await sendViaBrevo(to, subject, text, html);
    }
    const t = await smtpTransport();
    if (!t) {
      console.warn('[email] No transport configured — logging instead:', to, subject);
      return { delivered: false, reason: 'no_transport' };
    }
    const info = await t.sendMail({ from: config.smtp.from, to, subject, text, html });
    return { delivered: true, messageId: info.messageId };
  } catch (e) {
    console.warn('[email] send failed:', e.message);
    return { delivered: false, reason: e.message };
  }
}

module.exports = { sendEmail };
