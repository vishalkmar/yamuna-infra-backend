const config = require('../config/env');

// Lazy nodemailer transport (created once). Uses SMTP_* from .env.
let _transport = null;
function transport() {
  if (_transport) return _transport;
  if (!config.smtp.host || !config.smtp.user) return null;
  // eslint-disable-next-line global-require
  const nodemailer = require('nodemailer');
  _transport = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: { user: config.smtp.user, pass: config.smtp.pass },
  });
  return _transport;
}

// Send one email. Resolves { delivered, ... }; never throws.
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
