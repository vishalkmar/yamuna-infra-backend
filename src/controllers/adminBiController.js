const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const M = require('../models/AgentBiModel');

exports.overview = asyncHandler(async (req, res) => {
  const months = Math.min(Math.max(parseInt(req.query.months, 10) || 6, 1), 24);
  const [trend, inventory] = await Promise.all([M.trend(months), M.inventory()]);
  return success(res, { trend, inventory });
});

const csvCell = v => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
exports.exportCsv = asyncHandler(async (req, res) => {
  const months = Math.min(Math.max(parseInt(req.query.months, 10) || 12, 1), 24);
  const trend = await M.trend(months);
  const header = ['Month', 'Bookings', 'Sales value', 'Commission'];
  const lines = trend.map(r => [r.ym, r.bookings, r.dealValue, r.commission].map(csvCell).join(','));
  const csv = [header.join(','), ...lines].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="ams-monthly-report.csv"');
  return res.send(csv);
});
