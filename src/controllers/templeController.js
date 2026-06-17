const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const TempleModel = require('../models/TempleModel');
const { validateDarshanDate, validateSeniors } = require('../utils/darshan');

// GET /api/temples/list
exports.listTemples = asyncHandler(async (req, res) => {
  const temples = await TempleModel.listTemples();
  return success(res, temples);
});

// GET /api/temples/festivals
exports.listFestivals = asyncHandler(async (req, res) => {
  const festivals = await TempleModel.listFestivals();
  return success(res, festivals);
});

// GET /api/temples/:templeId
exports.getTemple = asyncHandler(async (req, res) => {
  const temple = await TempleModel.getTemple(Number(req.params.templeId));
  if (!temple) throw new AppError('Temple not found', 404);
  return success(res, temple);
});

// GET /api/darshan/mine
exports.listMyDarshan = asyncHandler(async (req, res) => {
  const list = await TempleModel.listMyDarshan(req.user.sub);
  return success(res, list);
});

// Shared booking handler for /darshan/book and /darshan/vip-book
async function doBook(req, res, isVip) {
  const { templeIds, visitDate, visitTimeSlot, transportType, persons, seniorCitizens, groupName, specialPuja } = req.body;

  const dc = validateDarshanDate(visitDate);
  if (!dc.ok) throw new AppError(dc.reason, 400);
  const sc = validateSeniors(seniorCitizens, persons);
  if (!sc.ok) throw new AppError(sc.reason, 400);

  const booking = await TempleModel.bookDarshan({
    userId: req.user.sub, templeIds, visitDate, visitTimeSlot, transportType,
    persons, seniorCitizens, groupName, specialPuja, isVip,
  });

  const message = isVip
    ? `VIP darshan confirmed for ${visitDate}. Token: ${booking.bookingCode}.`
    : `Darshan package booked! Shuttle/transport details sent. Ref ${booking.bookingCode}.`;
  return success(res, booking, message, 201);
}

// POST /api/darshan/book
exports.bookDarshan = asyncHandler((req, res) => doBook(req, res, false));

// POST /api/darshan/vip-book
exports.bookVip = asyncHandler((req, res) => doBook(req, res, true));
