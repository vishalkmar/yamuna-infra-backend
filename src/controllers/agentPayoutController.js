const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const P = require('../models/PayoutModel');
const AgentModel = require('../models/AgentModel');
const AgentBankModel = require('../models/AgentBankModel');
const { streamPayoutPdf } = require('../services/payoutStatement');

exports.list = asyncHandler(async (req, res) => success(res, await P.listByAgent(req.agent.sub)));

exports.create = asyncHandler(async (req, res) => {
  const r = await P.createForAgent(req.agent.sub);
  return success(res, r, 'Payout requested', 201);
});

// GET /api/agent/payouts/:id/statement.pdf — own payout only.
exports.statement = asyncHandler(async (req, res) => {
  const payout = await P.getById(req.params.id);
  if (!payout || String(payout.agentId) !== String(req.agent.sub)) throw new AppError('Payout not found', 404);
  const agent = await AgentModel.findById(req.agent.sub);
  const bank = await AgentBankModel.get(req.agent.sub);
  return streamPayoutPdf(res, { payout, agent, bank });
});
