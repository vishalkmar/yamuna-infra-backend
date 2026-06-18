const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const ConstructionModel = require('../models/ConstructionModel');

// GET /api/construction/properties — resident's own properties (summary cards)
exports.myProperties = asyncHandler(async (req, res) => {
  const rows = await ConstructionModel.listMyProperties(req.user.sub);
  return success(res, rows);
});

// GET /api/construction/property/:propertyId/progress
exports.progress = asyncHandler(async (req, res) => {
  const propertyId = Number(req.params.propertyId);
  if (!(await ConstructionModel.userOwnsProperty(req.user.sub, propertyId))) {
    throw new AppError('Property not found', 404);
  }
  const data = await ConstructionModel.getResidentProgress(propertyId);
  return success(res, data);
});

// GET /api/construction/property/:propertyId/updates?limit=
exports.updates = asyncHandler(async (req, res) => {
  const propertyId = Number(req.params.propertyId);
  if (!(await ConstructionModel.userOwnsProperty(req.user.sub, propertyId))) {
    throw new AppError('Property not found', 404);
  }
  const limit = req.query.limit ? Number(req.query.limit) : 20;
  return success(res, await ConstructionModel.getUpdates(propertyId, limit));
});

// GET /api/construction/property/:propertyId/step/:stepId
exports.step = asyncHandler(async (req, res) => {
  const propertyId = Number(req.params.propertyId);
  if (!(await ConstructionModel.userOwnsProperty(req.user.sub, propertyId))) {
    throw new AppError('Property not found', 404);
  }
  const data = await ConstructionModel.getResidentStep(propertyId, Number(req.params.stepId));
  if (!data) throw new AppError('Step not found', 404);
  return success(res, data);
});

module.exports = exports;
