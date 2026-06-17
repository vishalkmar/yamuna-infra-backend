const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const SupportModel = require('../models/SupportModel');
const UserModel = require('../models/UserModel');
const { agentForCategory } = require('../utils/support');
const { sendWhatsApp, sendSms } = require('../services/smsService');

// POST /api/support/tickets
exports.create = asyncHandler(async (req, res) => {
  const { category, subject, description, priority, attachments, bookingId } = req.body;

  const ticket = await SupportModel.createTicket({
    userId: req.user.sub,
    bookingId: bookingId || null,
    category,
    subject,
    description,
    priority,
    attachments,
  });

  // Fire-and-forget acknowledgement.
  try {
    const user = await UserModel.findById(req.user.sub);
    if (user?.mobile) {
      const msg = `Yamuna Infra: Ticket ${ticket.ticketCode} raised. Our team will respond within 24 hours.`;
      sendWhatsApp(user.mobile, msg);
      sendSms(user.mobile, msg);
    }
  } catch (e) {
    console.warn('[support] ack dispatch failed:', e.message);
  }

  return success(
    res,
    { id: ticket.id, ticketCode: ticket.ticketCode },
    `Ticket #${ticket.ticketCode} raised successfully. Expect response within 24 hours.`,
    201,
  );
});

// GET /api/support/tickets?status=open
exports.listMine = asyncHandler(async (req, res) => {
  const status = req.query.status ? String(req.query.status) : undefined;
  const list = await SupportModel.listForUser(req.user.sub, { status });
  return success(res, list);
});

// GET /api/support/tickets/:ticketId
exports.getOne = asyncHandler(async (req, res) => {
  const ticketId = Number(req.params.ticketId);
  const ticket = await SupportModel.findTicket(ticketId, req.user.sub);
  if (!ticket) throw new AppError('Ticket not found', 404);
  if (ticket._forbidden) throw new AppError('Not your ticket', 403);

  const { messages, attachments } = await SupportModel.getThread(ticketId);
  return success(res, { ...ticket, messages, attachments });
});

// POST /api/support/tickets/:ticketId/reply
exports.reply = asyncHandler(async (req, res) => {
  const ticketId = Number(req.params.ticketId);
  const { body } = req.body;

  const ticket = await SupportModel.findTicket(ticketId, req.user.sub);
  if (!ticket) throw new AppError('Ticket not found', 404);
  if (ticket._forbidden) throw new AppError('Not your ticket', 403);
  if (ticket.status === 'closed') throw new AppError('This ticket is closed. Please raise a new one.', 409);

  const message = await SupportModel.addReply(ticketId, 'user', body);
  return success(res, message, 'Reply sent');
});

// PATCH /api/support/tickets/:ticketId/rate
exports.rate = asyncHandler(async (req, res) => {
  const ticketId = Number(req.params.ticketId);
  const { rating } = req.body;

  const ticket = await SupportModel.findTicket(ticketId, req.user.sub);
  if (!ticket) throw new AppError('Ticket not found', 404);
  if (ticket._forbidden) throw new AppError('Not your ticket', 403);

  await SupportModel.rate(ticketId, rating);
  return success(res, { id: ticketId, rating }, 'Thanks for rating your experience!');
});

// POST /api/support/appointments
exports.bookAppointment = asyncHandler(async (req, res) => {
  const { ticketId, scheduledAt, mode, category } = req.body;

  let agentName = agentForCategory(category || 'general');
  if (ticketId) {
    const ticket = await SupportModel.findTicket(Number(ticketId), req.user.sub);
    if (!ticket) throw new AppError('Ticket not found', 404);
    if (ticket._forbidden) throw new AppError('Not your ticket', 403);
    agentName = ticket.assignedAgent || agentForCategory(ticket.category);
  }

  const appt = await SupportModel.bookAppointment({
    ticketId: ticketId || null,
    userId: req.user.sub,
    agentName,
    scheduledAt,
    mode,
  });

  return success(
    res,
    appt,
    `Appointment booked with ${appt.agentName} on ${scheduledAt}.`,
    201,
  );
});
