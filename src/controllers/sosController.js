const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const SosModel = require('../models/SosModel');
const UserModel = require('../models/UserModel');
const { validateContact, isValidBloodGroup } = require('../utils/sos');
const { sendWhatsApp, sendSms } = require('../services/smsService');
const { sendEmail } = require('../services/emailService');

// POST /api/sos/activate
exports.activate = asyncHandler(async (req, res) => {
  const { lat, lng, notes } = req.body;

  const sos = await SosModel.activate({ userId: req.user.sub, lat, lng, notes });

  // Fire-and-forget: notify saved emergency contacts + helpdesk.
  try {
    const [contacts, user] = await Promise.all([
      SosModel.getContacts(req.user.sub),
      UserModel.findById(req.user.sub),
    ]);
    const msg = `🆘 SOS from ${user?.name || 'a Yamuna Infra resident'}. Help dispatched (${sos.requestCode}). ETA ~${sos.etaMinutes} min.`;
    for (const c of contacts) {
      sendWhatsApp(c.phone, msg);
      sendSms(c.phone, msg);
    }
  } catch (e) {
    console.warn('[sos] contact notify failed:', e.message);
  }

  return success(res, {
    ...sos,
    gpsFix: lat != null && lng != null,
  }, 'SOS ACTIVATED — Help is on the way! Helpdesk notified.', 201);
});

// POST /api/sos/dispatch
// Push the user's live location to the supplied emergency persons. Email is
// sent for real via SMTP; SMS/WhatsApp go through the (pluggable) gateway.
exports.dispatch = asyncHandler(async (req, res) => {
  const { location, message, contacts } = req.body;
  const list = Array.isArray(contacts) ? contacts : [];
  const mapsLink = location && location.lat != null && location.lng != null
    ? `https://maps.google.com/?q=${location.lat},${location.lng}`
    : null;
  const text = message || `🆘 EMERGENCY — help needed. ${mapsLink ? `Location: ${mapsLink}` : 'Location unavailable.'}`;

  let emailed = 0;
  let messaged = 0;
  await Promise.all(list.map(async c => {
    if (c.phone) { sendWhatsApp(c.phone, text); sendSms(c.phone, text); messaged += 1; }
    if (c.email) {
      const r = await sendEmail(c.email, '🆘 SOS Emergency Alert', text,
        `<p style="font-size:16px"><b>🆘 EMERGENCY</b></p><p>${text.replace(/</g, '&lt;')}</p>` +
        (mapsLink ? `<p><a href="${mapsLink}">Open live location on map</a></p>` : ''));
      if (r.delivered) emailed += 1;
    }
  }));

  return success(res, {
    notified: list.length, emailed, messaged, channels: ['whatsapp', 'sms', 'email'],
  }, 'Emergency contacts alerted.');
});

// POST /api/sos/contacts
exports.saveContacts = asyncHandler(async (req, res) => {
  const { contacts, bloodGroup, medicalNotes } = req.body;

  if (!Array.isArray(contacts) || contacts.length === 0) {
    throw new AppError('Add at least one emergency contact', 400);
  }
  for (const c of contacts) {
    const v = validateContact(c);
    if (!v.ok) throw new AppError(v.reason, 400);
  }
  if (bloodGroup && !isValidBloodGroup(bloodGroup)) {
    throw new AppError('Invalid blood group', 400);
  }

  await SosModel.saveContactsAndProfile({
    userId: req.user.sub, contacts, bloodGroup, medicalNotes,
  });
  return success(res, { count: contacts.length }, 'Emergency contacts saved successfully.');
});

// GET /api/sos/contacts
exports.getContacts = asyncHandler(async (req, res) => {
  const [contacts, profile] = await Promise.all([
    SosModel.getContacts(req.user.sub),
    SosModel.getProfile(req.user.sub),
  ]);
  return success(res, { contacts, ...profile });
});

// GET /api/sos/ambulance/track/:requestId
exports.track = asyncHandler(async (req, res) => {
  const requestId = Number(req.params.requestId);
  const row = await SosModel.track(requestId, req.user.sub);
  if (!row) throw new AppError('SOS request not found', 404);
  if (row._forbidden) throw new AppError('Not your request', 403);
  return success(res, row);
});
