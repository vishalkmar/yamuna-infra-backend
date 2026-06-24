const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const Leads = require('../models/AgentLeadModel');
const Visits = require('../models/AgentVisitModel');
const Bookings = require('../models/AgentBookingModel');
const Ledger = require('../models/CommissionLedgerModel');

// GET /api/agent/dashboard — the agent's own KPIs (1.7).
exports.summary = asyncHandler(async (req, res) => {
  const id = req.agent.sub;
  const [leads, visits, bookings, earnings] = await Promise.all([
    Leads.list(id),
    Visits.list(id),
    Bookings.list(id),
    Ledger.totals(id),
  ]);
  const openLeads = leads.filter(l => !['booked', 'lost'].includes(l.stage)).length;
  const upcomingVisits = visits.filter(v => ['requested', 'confirmed'].includes(v.status)).length;
  const approvedBookings = bookings.filter(b => b.status === 'approved').length;
  return success(res, {
    counts: {
      leads: leads.length, openLeads,
      visits: visits.length, upcomingVisits,
      bookings: bookings.length, approvedBookings,
    },
    earnings,
  });
});
