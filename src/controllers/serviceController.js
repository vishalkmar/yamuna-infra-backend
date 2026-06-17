const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const ServiceModel = require('../models/ServiceModel');
const { validateStartDate, normalizeMeals } = require('../utils/services');

// GET /api/services/categories
exports.getCategories = asyncHandler(async (req, res) => {
  const categories = await ServiceModel.listCategories();
  return success(res, categories);
});

// GET /api/services/providers?category=cleaning&genderPref=female
exports.getProviders = asyncHandler(async (req, res) => {
  const categoryCode = req.query.category ? String(req.query.category) : undefined;
  const genderPref = req.query.genderPref ? String(req.query.genderPref) : undefined;
  const providers = await ServiceModel.listProviders({ categoryCode, genderPref });
  return success(res, providers);
});

// GET /api/services/providers/:id/offerings
exports.getOfferings = asyncHandler(async (req, res) => {
  const offerings = await ServiceModel.listOfferings(req.params.id);
  return success(res, offerings);
});

// POST /api/services/book
exports.book = asyncHandler(async (req, res) => {
  const { category, providerId, frequency, startDate, preferredTime, specialNotes, genderPref,
    meals, dietType, persons } = req.body;

  const dc = validateStartDate(startDate);
  if (!dc.ok) throw new AppError(dc.reason, 400);

  const booking = await ServiceModel.book({
    userId: req.user.sub,
    categoryCode: category,
    providerId,
    frequency,
    startDate,
    preferredTime,
    specialNotes,
    genderPref,
    meals: normalizeMeals(meals),
    dietType,
    persons,
  });
  if (!booking) throw new AppError('Unknown service category', 400);

  return success(
    res,
    { id: booking.id, category, startDate },
    `Service booked for ${startDate}. Provider will confirm shortly.`,
    201,
  );
});

// GET /api/services/bookings?category=cleaning
exports.listMine = asyncHandler(async (req, res) => {
  const categoryCode = req.query.category ? String(req.query.category) : undefined;
  const list = await ServiceModel.listMyBookings(req.user.sub, { categoryCode });
  return success(res, list);
});
