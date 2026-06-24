const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const M = require('../models/AdminBookingModel');
const Docs = require('../models/BookingDocModel');

exports.list = asyncHandler(async (req, res) =>
  success(res, await M.list({
    status: req.query.status, agentId: req.query.agentId, projectId: req.query.projectId,
    search: req.query.search, page: req.query.page, pageSize: req.query.pageSize,
  })));

exports.stats = asyncHandler(async (req, res) => success(res, await M.stats()));

// GET /api/admin/bookings/export.csv — sales report (3.8).
const csvCell = v => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
exports.exportCsv = asyncHandler(async (req, res) => {
  const rows = await M.listAll({
    status: req.query.status, agentId: req.query.agentId,
    projectId: req.query.projectId, search: req.query.search,
  });
  const header = ['ID', 'Created', 'Buyer', 'Phone', 'Agent', 'Project', 'Unit', 'Deal value', 'Booking amount', 'Status', 'Resident linked'];
  const lines = rows.map(r => [
    r.id, r.createdAt, r.buyerName, r.buyerPhone, r.agentName, r.projectName, r.unitNo,
    r.dealValue, r.bookingAmount, r.status, r.linkedUserId ? 'yes' : 'no',
  ].map(csvCell).join(','));
  const csv = [header.join(','), ...lines].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="agent-bookings.csv"');
  return res.send(csv);
});

exports.getById = asyncHandler(async (req, res) => {
  const booking = await M.getById(req.params.id);
  if (!booking) throw new AppError('Booking not found', 404);
  return success(res, booking);
});

// POST /api/admin/bookings/:id/approve
exports.approve = asyncHandler(async (req, res) => {
  await M.approve(req.params.id, req.admin.name);
  return success(res, { id: Number(req.params.id), status: 'approved' }, 'Booking approved');
});

// POST /api/admin/bookings/:id/cancel
exports.cancel = asyncHandler(async (req, res) => {
  await M.cancel(req.params.id, req.body.reason);
  return success(res, { id: Number(req.params.id), status: 'cancelled' }, 'Booking cancelled');
});

// POST /api/admin/bookings/:id/link — push approved booking → resident system.
exports.linkToResident = asyncHandler(async (req, res) => {
  const r = await M.linkToResident(req.params.id);
  return success(res, r, r.createdUser ? 'Resident created & linked' : 'Linked to existing resident');
});

// ---------- Documents (3.5) ----------
exports.listDocs = asyncHandler(async (req, res) => {
  const booking = await M.getById(req.params.id);
  if (!booking) throw new AppError('Booking not found', 404);
  return success(res, await Docs.list(req.params.id));
});

exports.addDoc = asyncHandler(async (req, res) => {
  const booking = await M.getById(req.params.id);
  if (!booking) throw new AppError('Booking not found', 404);
  const r = await Docs.create({ bookingId: req.params.id, ...req.body, byType: 'admin', byName: req.admin.name });
  return success(res, r, 'Document added', 201);
});

exports.deleteDoc = asyncHandler(async (req, res) => {
  const ok = await Docs.remove(req.params.docId);
  if (!ok) throw new AppError('Document not found', 404);
  return success(res, null, 'Document removed');
});

module.exports = exports;
