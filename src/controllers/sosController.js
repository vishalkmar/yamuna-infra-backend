const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const SosAdminModel = require('../models/SosAdminModel');

// POST /api/sos/activate — raises a live alert the reception sees in real time.
exports.activate = asyncHandler(async (req, res) => {
  const { lat, lng, notes } = req.body;
  const id = await SosAdminModel.createAlert(req.user.sub, { lat, lng, notes });
  return success(res, {
    id,
    requestCode: `SOS-${id}`,
    status: 'active',
    gpsFix: lat != null && lng != null,
  }, 'SOS ACTIVATED — reception alerted. Help is on the way!', 201);
});

// GET /api/sos/contacts — admin-managed SOS number + emergency services
// (shown to the resident in the app so they can call directly).
exports.getContacts = asyncHandler(async (req, res) => {
  return success(res, await SosAdminModel.getPublicConfig());
});

module.exports = exports;
