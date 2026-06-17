const config = require('../config/env');

// Pluggable SMS sender. In dev we just log to console; swap with MSG91/Twilio in prod.
async function sendSms(mobile, message) {
  if (config.sms.provider === 'console') {
    console.log(`\n[SMS → +91 ${mobile}] ${message}\n`);
    return { delivered: true, provider: 'console' };
  }
  // TODO: integrate real provider here using config.sms.apiKey
  console.warn(`[sms] provider "${config.sms.provider}" not implemented yet`);
  return { delivered: false };
}

async function sendWhatsApp(mobile, message) {
  // TODO: hook up WhatsApp Business API. For dev we just log so flows can be
  // exercised without a real integration.
  console.log(`\n[WhatsApp → +91 ${mobile}] ${message}\n`);
  return { delivered: true, provider: 'console' };
}

module.exports = { sendSms, sendWhatsApp };
