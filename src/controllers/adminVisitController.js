const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const M = require('../models/AdminVisitModel');

exports.list = asyncHandler(async (req, res) =>
  success(res, await M.list({
    status: req.query.status, agentId: req.query.agentId, projectId: req.query.projectId,
    date: req.query.date, search: req.query.search, page: req.query.page, pageSize: req.query.pageSize,
  })));

exports.stats = asyncHandler(async (req, res) => success(res, await M.stats()));

exports.getById = asyncHandler(async (req, res) => {
  const visit = await M.getById(req.params.id);
  if (!visit) throw new AppError('Visit not found', 404);
  return success(res, visit);
});

exports.checkIn = asyncHandler(async (req, res) => {
  const ok = await M.checkIn(req.params.id);
  if (!ok) throw new AppError('Visit not found or not checkable', 404);
  return success(res, null, 'Checked in');
});

exports.setStatus = asyncHandler(async (req, res) => {
  const ok = await M.setStatus(req.params.id, req.body.status, { outcome: req.body.outcome, feedback: req.body.feedback });
  if (!ok) throw new AppError('Visit not found', 404);
  return success(res, { id: Number(req.params.id), status: req.body.status }, 'Visit updated');
});
