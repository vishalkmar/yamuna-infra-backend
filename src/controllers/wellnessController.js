const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const WellnessModel = require('../models/WellnessModel');
const { validateWellnessDate, isValidDuration } = require('../utils/wellness');

// GET /api/spiritual/services  (admin-managed puja/seva catalog)
exports.spiritualServices = asyncHandler(async (req, res) => {
  return success(res, await WellnessModel.listSpiritualServices());
});

// GET /api/wellness/therapies
exports.getTherapies = asyncHandler(async (req, res) => {
  const therapies = await WellnessModel.listTherapies();
  return success(res, therapies);
});

// GET /api/wellness/categories  (Task 2 — category → activity view)
exports.getCategories = asyncHandler(async (req, res) => {
  return success(res, await WellnessModel.listCategories());
});

// GET /api/wellness/slots/:date
exports.getSlots = asyncHandler(async (req, res) => {
  const date = String(req.params.date);
  const dc = validateWellnessDate(date);
  if (!dc.ok) return success(res, { date, slots: [], blocked: true, reason: dc.reason });
  const slots = await WellnessModel.getSlots(date);
  return success(res, { date, slots });
});

// POST /api/wellness/book
exports.book = asyncHandler(async (req, res) => {
  const { therapyId, durationMin, therapistGender, date, timeSlot, healthNote } = req.body;

  const dc = validateWellnessDate(date);
  if (!dc.ok) throw new AppError(dc.reason, 400);
  if (!isValidDuration(durationMin)) throw new AppError('Invalid duration', 400);

  const therapy = await WellnessModel.getTherapy(therapyId);
  if (!therapy) throw new AppError('Therapy not found', 404);

  const slots = await WellnessModel.getSlots(date);
  if (!slots.includes(timeSlot)) {
    throw new AppError('Selected therapist not available. Please choose another slot.', 409);
  }

  const booking = await WellnessModel.book({
    userId: req.user.sub, therapyId, durationMin, therapistGender, date, timeSlot, healthNote,
  });

  const message = therapy.isPackage
    ? `${therapy.name} package activated. ${therapy.packageDays}-day course starts ${date}.`
    : `${therapy.name} booked for ${date} at ${timeSlot} at the Wellness Center.`;

  return success(res, { ...booking, therapyName: therapy.name, isPackage: therapy.isPackage }, message, 201);
});

// GET /api/wellness/bookings
exports.listMine = asyncHandler(async (req, res) => {
  const list = await WellnessModel.listBookings(req.user.sub);
  return success(res, list);
});
