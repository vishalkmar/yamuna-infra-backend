const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const P = require('../models/PayoutModel');
const AdminAgentModel = require('../models/AdminAgentModel');
const AgentBankModel = require('../models/AgentBankModel');
const { streamPayoutPdf } = require('../services/payoutStatement');

exports.list = asyncHandler(async (req, res) =>
  success(res, await P.adminList({ status: req.query.status, agentId: req.query.agentId, page: req.query.page, pageSize: req.query.pageSize })));

exports.stats = asyncHandler(async (req, res) => success(res, await P.stats()));

exports.getById = asyncHandler(async (req, res) => {
  const payout = await P.getById(req.params.id);
  if (!payout) throw new AppError('Payout not found', 404);
  return success(res, payout);
});

exports.setStatus = asyncHandler(async (req, res) => {
  await P.setStatus(req.params.id, req.body.status, {
    txnRef: req.body.txnRef, method: req.body.method, reason: req.body.reason,
    tdsPercent: req.body.tdsPercent, processedBy: req.admin.name,
  });
  return success(res, { id: Number(req.params.id), status: req.body.status }, 'Payout updated');
});

// GET /api/admin/payouts/:id/statement.pdf
exports.statement = asyncHandler(async (req, res) => {
  const payout = await P.getById(req.params.id);
  if (!payout) throw new AppError('Payout not found', 404);
  const agent = payout.agentId ? await AdminAgentModel.getById(payout.agentId) : null;
  const bank = payout.agentId ? await AgentBankModel.get(payout.agentId) : null;
  return streamPayoutPdf(res, { payout, agent, bank });
});
