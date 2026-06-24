const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const Bank = require('../models/AgentBankModel');
const AgentModel = require('../models/AgentModel');

// GET /api/agent/bank — payout profile: bank details + PAN/GST.
exports.get = asyncHandler(async (req, res) => {
  const agent = await AgentModel.findById(req.agent.sub);
  if (!agent) throw new AppError('Agent not found', 404);
  const bank = await Bank.get(req.agent.sub);
  return success(res, { bank, pan: agent.pan || null, gst: agent.gst || null });
});

// PUT /api/agent/bank — upsert bank details + PAN/GST. Resets verification.
exports.update = asyncHandler(async (req, res) => {
  const { pan, gst, ...bank } = req.body;
  await Bank.upsert(req.agent.sub, bank);
  await Bank.updateTaxIds(req.agent.sub, { pan, gst });
  return success(res, null, 'Payout details saved');
});
