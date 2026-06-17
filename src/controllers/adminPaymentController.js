const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const M = require('../models/AdminPaymentModel');

function pick(q) {
  return { status: q.status, method: q.method, from: q.from, to: q.to, search: q.search };
}

// GET /api/admin/payments?status=&method=&from=&to=&search=&page=
exports.list = asyncHandler(async (req, res) => {
  const filters = { ...pick(req.query), page: req.query.page, pageSize: req.query.pageSize };
  const [data, summary, methods] = await Promise.all([
    M.list(filters), M.summary(pick(req.query)), M.methods(),
  ]);
  return success(res, { ...data, summary, methods });
});

// POST /api/admin/payments/:id/refund
exports.refund = asyncHandler(async (req, res) => {
  const ok = await M.refund(req.params.id);
  if (!ok) throw new AppError('Payment not found or not refundable (only successful payments).', 404);
  return success(res, { id: Number(req.params.id), status: 'refunded' }, 'Payment refunded');
});

// GET /api/admin/payments/export.csv
exports.exportCsv = asyncHandler(async (req, res) => {
  const rows = await M.exportRows(pick(req.query));
  const headers = ['id', 'txnId', 'paidAt', 'userName', 'userMobile', 'bookingCode', 'unit', 'installmentLabel', 'method', 'amount', 'status', 'remarks'];
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.join(',')];
  for (const r of rows) lines.push(headers.map(h => esc(r[h])).join(','));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="payments-${Date.now()}.csv"`);
  return res.send(lines.join('\n'));
});
