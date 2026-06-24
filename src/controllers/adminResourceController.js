const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const M = require('../models/AgentResourceModel');

const kindOf = req => (req.query.kind || req.body.kind || 'collateral');

exports.list = asyncHandler(async (req, res) =>
  success(res, await M.adminList(kindOf(req), { category: req.query.category, search: req.query.search })));

exports.create = asyncHandler(async (req, res) => {
  const r = await M.create(req.body);
  return success(res, r, 'Resource added', 201);
});

exports.update = asyncHandler(async (req, res) => {
  const ok = await M.update(req.params.id, req.body);
  if (!ok) throw new AppError('Resource not found', 404);
  return success(res, { id: Number(req.params.id) }, 'Resource updated');
});

exports.remove = asyncHandler(async (req, res) => {
  const ok = await M.remove(req.params.id);
  if (!ok) throw new AppError('Resource not found', 404);
  return success(res, null, 'Resource deleted');
});
