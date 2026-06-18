const config = require('../config/env');

// Lazy nodemailer transport (created once). Uses SMTP_* from .env. Fail-fast
// timeouts so a blocked outbound SMTP port can never hang the request for long.
let _transport = null;
function transport() {
  if (_transport) return _transport;
  if (!config.smtp.host || !config.smtp.user) return null;
  // eslint-disable-next-line global-require
  const nodemailer = require('nodemailer');
  _transport = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure, // 465 => true (SSL), 587 => false (STARTTLS)
    auth: { user: config.smtp.user, pass: config.smtp.pass },
    requireTLS: !config.smtp.secure, // force STARTTLS on 587
    connectionTimeout: 12000,
    greetingTimeout: 12000,
    socketTimeout: 15000,
    tls: { rejectUnauthorized: false },
  });
  return _transport;
}

// Send one email via Gmail SMTP. Resolves { delivered, ... }; never throws.
async function sendEmail(to, subject, text, html) {
  const t = transport();
  if (!t) {
    console.warn('[email] SMTP not configured — logging instead:', to, subject);
    return { delivered: false, reason: 'smtp_not_configured' };
  }
  try {
    const info = await t.sendMail({ from: config.smtp.from, to, subject, text, html });
    return { delivered: true, messageId: info.messageId };
  } catch (e) {
    console.warn('[email] send failed:', e.message);
    return { delivered: false, reason: e.message };
  }
}

module.exports = { sendEmail };
