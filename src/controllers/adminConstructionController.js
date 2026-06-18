const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const ConstructionModel = require('../models/ConstructionModel');

// GET /api/admin/construction/properties?search=
exports.listProperties = asyncHandler(async (req, res) => {
  const rows = await ConstructionModel.listProperties({ search: req.query.search });
  return success(res, rows);
});

// GET /api/admin/construction/property/:propertyId
exports.detail = asyncHandler(async (req, res) => {
  const data = await ConstructionModel.getAdminDetail(req.params.propertyId);
  if (!data) throw new AppError('Property not found', 404);
  return success(res, data);
});

// PUT /api/admin/construction/property/:propertyId/overall
exports.updateOverall = asyncHandler(async (req, res) => {
  const ok = await ConstructionModel.updateOverall(req.params.propertyId, req.body);
  if (!ok) throw new AppError('Property not found', 404);
  return success(res, await ConstructionModel.getAdminDetail(req.params.propertyId), 'Progress updated');
});

// ----- Steps -----
exports.createStep = asyncHandler(async (req, res) => {
  const owner = await ConstructionModel.propertyOwner(req.params.propertyId);
  if (!owner) throw new AppError('Property not found', 404);
  await ConstructionModel.createStep(req.params.propertyId, req.body);
  return success(res, await ConstructionModel.getSteps(req.params.propertyId), 'Step added', 201);
});

exports.updateStep = asyncHandler(async (req, res) => {
  const propertyId = await ConstructionModel.stepProperty(req.params.stepId);
  if (!propertyId) throw new AppError('Step not found', 404);
  await ConstructionModel.updateStep(req.params.stepId, req.body);
  return success(res, await ConstructionModel.getSteps(propertyId), 'Step updated');
});

exports.deleteStep = asyncHandler(async (req, res) => {
  const propertyId = await ConstructionModel.stepProperty(req.params.stepId);
  if (!propertyId) throw new AppError('Step not found', 404);
  await ConstructionModel.deleteStep(req.params.stepId);
  return success(res, await ConstructionModel.getSteps(propertyId), 'Step deleted');
});

// PUT /api/admin/construction/property/:propertyId/steps/reorder  { order: [id,...] }
exports.reorderSteps = asyncHandler(async (req, res) => {
  const owner = await ConstructionModel.propertyOwner(req.params.propertyId);
  if (!owner) throw new AppError('Property not found', 404);
  await ConstructionModel.reorderSteps(req.params.propertyId, req.body.order);
  return success(res, await ConstructionModel.getSteps(req.params.propertyId), 'Order saved');
});

// ----- Entries (dated photo logs inside a step) -----
exports.addEntry = asyncHandler(async (req, res) => {
  const propertyId = await ConstructionModel.stepProperty(req.params.stepId);
  if (!propertyId) throw new AppError('Step not found', 404);
  await ConstructionModel.addEntry(req.params.stepId, req.body);
  return success(res, await ConstructionModel.getSteps(propertyId), 'Entry added', 201);
});

exports.updateEntry = asyncHandler(async (req, res) => {
  const stepId = await ConstructionModel.entryStep(req.params.entryId);
  if (!stepId) throw new AppError('Entry not found', 404);
  const propertyId = await ConstructionModel.stepProperty(stepId);
  await ConstructionModel.updateEntry(req.params.entryId, req.body);
  return success(res, await ConstructionModel.getSteps(propertyId), 'Entry updated');
});

exports.deleteEntry = asyncHandler(async (req, res) => {
  const stepId = await ConstructionModel.entryStep(req.params.entryId);
  if (!stepId) throw new AppError('Entry not found', 404);
  const propertyId = await ConstructionModel.stepProperty(stepId);
  await ConstructionModel.deleteEntry(req.params.entryId);
  return success(res, await ConstructionModel.getSteps(propertyId), 'Entry deleted');
});

// ----- Weekly updates -----
exports.addUpdate = asyncHandler(async (req, res) => {
  const owner = await ConstructionModel.propertyOwner(req.params.propertyId);
  if (!owner) throw new AppError('Property not found', 404);
  await ConstructionModel.addUpdate(req.params.propertyId, req.body);
  return success(res, await ConstructionModel.getUpdates(req.params.propertyId), 'Update posted', 201);
});

exports.deleteUpdate = asyncHandler(async (req, res) => {
  await ConstructionModel.deleteUpdate(req.params.updateId);
  return success(res, { id: Number(req.params.updateId) }, 'Update deleted');
});
