const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const M = require('../models/AgentTargetModel');

exports.list = asyncHandler(async (req, res) =>
  success(res, await M.adminList({ agentId: req.query.agentId, status: req.query.status })));

exports.create = asyncHandler(async (req, res) => {
  const r = await M.create(req.body);
  return success(res, r, 'Target created', 201);
});

exports.update = asyncHandler(async (req, res) => {
  const ok = await M.update(req.params.id, req.body);
  if (!ok) throw new AppError('Target not found', 404);
  return success(res, { id: Number(req.params.id) }, 'Target updated');
});

exports.remove = asyncHandler(async (req, res) => {
  const ok = await M.remove(req.params.id);
  if (!ok) throw new AppError('Target not found', 404);
  return success(res, null, 'Target deleted');
});

exports.award = asyncHandler(async (req, res) => {
  const r = await M.award(req.params.id);
  return success(res, r, 'Incentive awarded');
});
