const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const SiteVisitModel = require('../models/SiteVisitModel');
const UserModel = require('../models/UserModel');
const { validateVisitDate } = require('../utils/visitDate');
const { sendWhatsApp, sendSms } = require('../services/smsService');

const ALLOWED_TYPES = ['personal', 'family', 'banker'];
const ALLOWED_LANGS = ['hindi', 'english', 'marathi'];

// GET /api/site-visit/slots?projectId=1&date=2026-06-10
exports.getSlots = asyncHandler(async (req, res) => {
  const projectId = Number(req.query.projectId);
  const date = String(req.query.date);

  const dateCheck = validateVisitDate(date);
  if (!dateCheck.ok) {
    return success(res, { date, slots: [], blackedOut: false, blocked: true, reason: dateCheck.reason });
  }

  const result = await SiteVisitModel.getSlotsForDate(projectId, date);
  return success(res, {
    date,
    blackedOut: result.blackedOut,
    reason: result.reason || null,
    slots: result.slots,
  });
});

// GET /api/site-visit/virtual-tours/:projectId
exports.getVirtualTours = asyncHandler(async (req, res) => {
  const projectId = Number(req.params.projectId);
  const tours = await SiteVisitModel.getVirtualTours(projectId);
  return success(res, tours);
});

// POST /api/site-visit/book
exports.book = asyncHandler(async (req, res) => {
  const { projectId, visitDate, visitTime, visitType, visitorCount, specialNeeds, preferredLang } = req.body;

  const dc = validateVisitDate(visitDate);
  if (!dc.ok) throw new AppError(dc.reason, 400);

  if (await SiteVisitModel.isBlackoutDate(projectId, visitDate)) {
    throw new AppError('This date is blocked (holiday/maintenance). Please pick another day.', 400);
  }

  const { slots, blackedOut } = await SiteVisitModel.getSlotsForDate(projectId, visitDate);
  if (blackedOut) throw new AppError('This date is blocked.', 400);

  const matching = slots.find(s => s.slotTime === visitTime || s.slotTime === visitTime + ':00');
  if (!matching) throw new AppError('Selected slot is not available for this date.', 400);
  if (matching.isFull) throw new AppError('Selected slot is no longer available. Please choose another time.', 409);

  const visit = await SiteVisitModel.book({
    userId: req.user.sub,
    projectId,
    visitDate,
    visitTime: matching.slotTime,
    visitType,
    visitorCount,
    specialNeeds,
    preferredLang,
  });

  // Fire-and-forget WhatsApp + SMS confirmation
  try {
    const user = await UserModel.findById(req.user.sub);
    const msg = `Your Yamuna Infra site visit is confirmed for ${visitDate} at ${matching.slotTime}. Confirmation: ${visit.confirmationCode}.`;
    if (user?.mobile) {
      sendWhatsApp(user.mobile, msg);
      sendSms(user.mobile, msg);
    }
  } catch (e) {
    // Don't fail the booking if notifications fail
    console.warn('[site-visit] notification dispatch failed:', e.message);
  }

  return success(res, {
    id: visit.id,
    confirmationCode: visit.confirmationCode,
    visitDate,
    visitTime: matching.slotTime,
  }, `Site visit booked for ${visitDate} at ${matching.slotTime}. Confirmation sent on WhatsApp.`);
});

// GET /api/site-visit/mine
exports.listMine = asyncHandler(async (req, res) => {
  const status = req.query.status ? String(req.query.status) : undefined;
  const list = await SiteVisitModel.listForUser(req.user.sub, { status });
  return success(res, list);
});

// GET /api/site-visit/:visitId
exports.getOne = asyncHandler(async (req, res) => {
  const visitId = Number(req.params.visitId);
  const v = await SiteVisitModel.findVisit(visitId, req.user.sub);
  if (!v) throw new AppError('Visit not found', 404);
  if (v._forbidden) throw new AppError('Not your visit', 403);
  return success(res, v);
});

// PATCH /api/site-visit/:visitId/cancel
exports.cancel = asyncHandler(async (req, res) => {
  const visitId = Number(req.params.visitId);
  const reason = req.body?.reason;

  const v = await SiteVisitModel.findVisit(visitId, req.user.sub);
  if (!v) throw new AppError('Visit not found', 404);
  if (v._forbidden) throw new AppError('Not your visit', 403);
  if (v.status === 'cancelled') throw new AppError('Visit is already cancelled', 409);

  await SiteVisitModel.cancel(visitId, reason);
  return success(res, { id: visitId, status: 'cancelled' }, 'Site visit cancelled');
});

// PATCH /api/site-visit/:visitId/reschedule
exports.reschedule = asyncHandler(async (req, res) => {
  const visitId = Number(req.params.visitId);
  const { visitDate, visitTime } = req.body;

  const v = await SiteVisitModel.findVisit(visitId, req.user.sub);
  if (!v) throw new AppError('Visit not found', 404);
  if (v._forbidden) throw new AppError('Not your visit', 403);
  if (v.status === 'cancelled') throw new AppError('Cancelled visits cannot be rescheduled', 409);
  if (Number(v.rescheduleCount) >= 3) throw new AppError('Maximum reschedules reached (3). Please cancel and rebook.', 409);

  const dc = validateVisitDate(visitDate);
  if (!dc.ok) throw new AppError(dc.reason, 400);

  if (await SiteVisitModel.isBlackoutDate(v.projectId, visitDate)) {
    throw new AppError('This date is blocked.', 400);
  }

  const { slots } = await SiteVisitModel.getSlotsForDate(v.projectId, visitDate);
  const matching = slots.find(s => s.slotTime === visitTime || s.slotTime === visitTime + ':00');
  if (!matching) throw new AppError('Selected slot is not available for this date.', 400);
  if (matching.isFull) throw new AppError('Selected slot is no longer available.', 409);

  await SiteVisitModel.reschedule(visitId, visitDate, matching.slotTime);
  return success(res, { id: visitId, visitDate, visitTime: matching.slotTime, status: 'rescheduled' },
    'Site visit rescheduled');
});

module.exports.ALLOWED_TYPES = ALLOWED_TYPES;
module.exports.ALLOWED_LANGS = ALLOWED_LANGS;
