const express = require('express');
const { requireAdmin } = require('../../middleware/requireAdmin');
const { sendEmail } = require('../../services/emailService');
const config = require('../../config/env');

const router = express.Router();

// GET /api/admin/diag/email?to=someone@example.com
// Sends a test email and returns the RAW result (delivered + reason) + timing,
// so we can see the actual SMTP error from the host (e.g. connection timeout =
// the host blocks the SMTP port, vs invalid-login = credential issue).
router.get('/email', requireAdmin(), async (req, res) => {
  const to = req.query.to || config.smtp.user;
  const t0 = Date.now();
  const result = await sendEmail(
    to,
    'Yamuna Infra SMTP diagnostic',
    'This is a diagnostic test email from the server.',
  );
  return res.json({
    success: true,
    build: 'ipv4-fix-2',
    to,
    ms: Date.now() - t0,
    smtp: { host: config.smtp.host, port: config.smtp.port, secure: config.smtp.secure, user: config.smtp.user },
    result,
  });
});

module.exports = router;
