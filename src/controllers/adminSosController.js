const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const SosAdminModel = require('../models/SosAdminModel');

// GET /api/admin/sos/config
exports.getConfig = asyncHandler(async (req, res) => {
  return success(res, await SosAdminModel.getPublicConfig());
});

// PUT /api/admin/sos/config  { sosPhone }
exports.setConfig = asyncHandler(async (req, res) => {
  await SosAdminModel.setSosPhone(req.body.sosPhone);
  return success(res, await SosAdminModel.getPublicConfig(), 'SOS number saved');
});

// POST /api/admin/sos/services
exports.addService = asyncHandler(async (req, res) => {
  await SosAdminModel.addService(req.body);
  return success(res, await SosAdminModel.listServices(), 'Service added', 201);
});

// PUT /api/admin/sos/services/:id
exports.updateService = asyncHandler(async (req, res) => {
  const ok = await SosAdminModel.updateService(req.params.id, req.body);
  if (!ok) throw new AppError('Service not found', 404);
  return success(res, await SosAdminModel.listServices(), 'Service updated');
});

// DELETE /api/admin/sos/services/:id
exports.deleteService = asyncHandler(async (req, res) => {
  await SosAdminModel.deleteService(req.params.id);
  return success(res, await SosAdminModel.listServices(), 'Service removed');
});

// GET /api/admin/sos/alerts/active  — reception polls this
exports.activeAlerts = asyncHandler(async (req, res) => {
  return success(res, await SosAdminModel.activeAlerts());
});

// POST /api/admin/sos/alerts/:id/ack
exports.ackAlert = asyncHandler(async (req, res) => {
  await SosAdminModel.acknowledge(req.params.id);
  return success(res, { id: Number(req.params.id) }, 'Alert acknowledged');
});

module.exports = exports;
