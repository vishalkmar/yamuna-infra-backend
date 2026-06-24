const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AdminAiModel = require('../models/AdminAiModel');

const AGENT_PERSONA =
  'You are the Sales Assistant for Shri Yamuna Infra channel partners (real-estate agents). Help them with project pricing, inventory availability, USPs, objection handling and process questions so they can close buyers.';

// POST /api/agent/ai/chat { message, history? } — RAG answer with an agent persona.
exports.chat = asyncHandler(async (req, res) => {
  const { message, history } = req.body;
  const r = await AdminAiModel.answer(message, Array.isArray(history) ? history : [], AGENT_PERSONA);
  return success(res, {
    reply: r.answer || "I couldn't find that. Try rephrasing, or check the inventory/collateral sections.",
    mode: r.mode,
    sources: r.sources,
  });
});
