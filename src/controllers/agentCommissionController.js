const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const L = require('../models/CommissionLedgerModel');

// GET /api/agent/commission — the agent's earnings ledger + totals.
exports.earnings = asyncHandler(async (req, res) => {
  const [entries, totals] = await Promise.all([
    L.listByAgent(req.agent.sub, { status: req.query.status }),
    L.totals(req.agent.sub),
  ]);
  return success(res, { entries, totals });
});
