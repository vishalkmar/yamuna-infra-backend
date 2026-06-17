const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const MobilityModel = require('../models/MobilityModel');
const { validateStartDate, computeTotal } = require('../utils/mobility');

// GET /api/mobility/aids?category=wheelchair
exports.getAids = asyncHandler(async (req, res) => {
  const category = req.query.category ? String(req.query.category) : undefined;
  const aids = await MobilityModel.listAids({ category });
  return success(res, aids);
});

// POST /api/mobility/book
exports.book = asyncHandler(async (req, res) => {
  const { aidId, mode, startDate, days, withAttendant, deliveryNote } = req.body;

  const dc = validateStartDate(startDate);
  if (!dc.ok) throw new AppError(dc.reason, 400);

  const aid = await MobilityModel.getAid(aidId);
  if (!aid) throw new AppError('Mobility aid not found', 404);
  if (mode === 'buy' && (aid.buyPrice == null || Number(aid.buyPrice) <= 0)) {
    throw new AppError('This aid is available for rent only', 400);
  }
  if (withAttendant && !aid.attendantAvailable) {
    throw new AppError('Trained attendant is not available for this aid', 400);
  }

  const total = computeTotal(aid, { mode, days, withAttendant });
  const booking = await MobilityModel.book({
    userId: req.user.sub, aidId, mode, startDate, days, withAttendant, deliveryNote, total,
  });

  const verb = mode === 'buy' ? 'purchased' : 'booked';
  return success(res, { ...booking, aidName: aid.name }, `${aid.name} ${verb}! Total ₹${total}.`, 201);
});

// GET /api/mobility/bookings
exports.listMine = asyncHandler(async (req, res) => {
  const list = await MobilityModel.listBookings(req.user.sub);
  return success(res, list);
});
