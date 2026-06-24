const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const M = require('../models/AgentAnalyticsModel');
const LeadAnalytics = require('../models/LeadAnalyticsModel');

exports.leads = asyncHandler(async (req, res) =>
  success(res, await LeadAnalytics.report({ from: req.query.from, to: req.query.to })));

exports.funnel = asyncHandler(async (req, res) =>
  success(res, await M.funnel({ from: req.query.from, to: req.query.to })));

exports.perAgent = asyncHandler(async (req, res) =>
  success(res, await M.perAgent({ from: req.query.from, to: req.query.to })));

const csvCell = v => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
exports.exportCsv = asyncHandler(async (req, res) => {
  const rows = await M.perAgent({ from: req.query.from, to: req.query.to });
  const header = ['Agent', 'Company', 'Leads', 'Visits', 'Bookings', 'Approved', 'Conversion %', 'Deal value', 'Commission'];
  const lines = rows.map(r => [r.agentName, r.companyName, r.leads, r.visits, r.bookings, r.approved, r.conversion, r.dealValue, r.commission].map(csvCell).join(','));
  const csv = [header.join(','), ...lines].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="agent-performance.csv"');
  return res.send(csv);
});
