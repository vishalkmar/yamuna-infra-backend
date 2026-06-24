const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const R = require('../models/CommissionRuleModel');
const L = require('../models/CommissionLedgerModel');

// ---------- Rules (4.1) ----------
exports.listRules = asyncHandler(async (req, res) => success(res, await R.list()));

exports.createRule = asyncHandler(async (req, res) => {
  const r = await R.create(req.body);
  return success(res, r, 'Rule created', 201);
});

exports.updateRule = asyncHandler(async (req, res) => {
  const ok = await R.update(req.params.id, req.body);
  if (!ok) throw new AppError('Rule not found', 404);
  return success(res, { id: Number(req.params.id) }, 'Rule updated');
});

exports.deleteRule = asyncHandler(async (req, res) => {
  const ok = await R.remove(req.params.id);
  if (!ok) throw new AppError('Rule not found', 404);
  return success(res, null, 'Rule deleted');
});

// ---------- Ledger (4.2) ----------
exports.listLedger = asyncHandler(async (req, res) =>
  success(res, await L.adminList({ status: req.query.status, agentId: req.query.agentId, page: req.query.page, pageSize: req.query.pageSize })));

exports.ledgerStats = asyncHandler(async (req, res) => success(res, await L.adminStats()));

exports.setLedgerStatus = asyncHandler(async (req, res) => {
  const ok = await L.setStatus(req.params.id, req.body.status);
  if (!ok) throw new AppError('Ledger entry not found', 404);
  return success(res, { id: Number(req.params.id), status: req.body.status }, 'Ledger updated');
});

exports.adjust = asyncHandler(async (req, res) => {
  const r = await L.adjust(req.body);
  return success(res, r, 'Adjustment added', 201);
});

// Preview: resolve the rule + compute commission for a hypothetical deal.
exports.preview = asyncHandler(async (req, res) => {
  const rule = await R.resolve({
    projectId: req.query.projectId ? Number(req.query.projectId) : null,
    tierId: req.query.tierId ? Number(req.query.tierId) : null,
    date: req.query.date,
  });
  const dealValue = Number(req.query.dealValue) || 0;
  const amount = R.compute(rule, dealValue);
  return success(res, { rule, dealValue, amount });
});
