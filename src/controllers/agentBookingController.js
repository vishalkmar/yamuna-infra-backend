const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const B = require('../models/AgentBookingModel');
const Leads = require('../models/AgentLeadModel');
const Docs = require('../models/BookingDocModel');

exports.list = asyncHandler(async (req, res) =>
  success(res, await B.list(req.agent.sub, { status: req.query.status })));

exports.get = asyncHandler(async (req, res) => {
  const booking = await B.getOwned(req.agent.sub, req.params.id);
  if (!booking) throw new AppError('Booking not found', 404);
  return success(res, booking);
});

// POST /api/agent/bookings — convert a lead into a booking on a chosen unit.
exports.create = asyncHandler(async (req, res) => {
  const lead = await Leads.getOwned(req.agent.sub, req.body.leadId);
  if (!lead) throw new AppError('Lead not found', 404);
  const r = await B.create({
    agentId: req.agent.sub,
    agentName: req.agent.name,
    leadId: lead.id,
    unitId: req.body.unitId,
    buyer: { name: lead.name, phone: lead.phone, email: lead.email },
    dealValue: req.body.dealValue,
    bookingAmount: req.body.bookingAmount,
    notes: req.body.notes,
  });
  return success(res, r, 'Booking created — pending approval', 201);
});

// POST /api/agent/bookings/:id/cancel — cancel own pending booking.
exports.cancel = asyncHandler(async (req, res) => {
  await B.cancel(req.agent.sub, req.params.id, req.body.reason);
  return success(res, { id: Number(req.params.id), status: 'cancelled' }, 'Booking cancelled');
});

// ---------- Documents (3.5, own bookings) ----------
exports.listDocs = asyncHandler(async (req, res) => {
  const booking = await B.getOwned(req.agent.sub, req.params.id);
  if (!booking) throw new AppError('Booking not found', 404);
  return success(res, await Docs.list(req.params.id));
});

exports.addDoc = asyncHandler(async (req, res) => {
  const booking = await B.getOwned(req.agent.sub, req.params.id);
  if (!booking) throw new AppError('Booking not found', 404);
  const r = await Docs.create({ bookingId: req.params.id, ...req.body, byType: 'agent', byName: req.agent.name });
  return success(res, r, 'Document added', 201);
});

exports.deleteDoc = asyncHandler(async (req, res) => {
  const doc = await Docs.getById(req.params.docId);
  if (!doc || !(await B.getOwned(req.agent.sub, doc.bookingId))) throw new AppError('Document not found', 404);
  await Docs.remove(req.params.docId);
  return success(res, null, 'Document removed');
});

module.exports = exports;
