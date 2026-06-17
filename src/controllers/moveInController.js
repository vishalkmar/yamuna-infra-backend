const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const MoveInModel = require('../models/MoveInModel');
const {
  validateMoveDate, isVendorAvailable, expectedActivationDate,
  normalizeItemCategories, providerForUtility,
} = require('../utils/movein');

const SHIFTING_VENDOR = 'PackMasters Logistics';

// POST /api/movein/shifting
exports.bookShifting = asyncHandler(async (req, res) => {
  const { bookingId, moveDate, fromAddress, toUnit, itemCategories, packingRequired, specialItems } = req.body;

  const dc = validateMoveDate(moveDate);
  if (!dc.ok) throw new AppError(dc.reason, 400);

  if (!isVendorAvailable(moveDate)) {
    throw new AppError('No vendors available on the selected date. Please try another date.', 409);
  }

  const cats = normalizeItemCategories(itemCategories);
  if (cats.length === 0) throw new AppError('Select at least one item category', 400);

  const booking = await MoveInModel.bookShifting({
    userId: req.user.sub, bookingId, moveDate, fromAddress, toUnit,
    itemCategories: cats, packingRequired, specialItems, vendorName: SHIFTING_VENDOR,
  });

  return success(
    res,
    { id: booking.id, vendorName: SHIFTING_VENDOR, moveDate },
    `Shifting booked! ${SHIFTING_VENDOR} will contact you 24h before your move date.`,
    201,
  );
});

// GET /api/movein/shifting
exports.listShifting = asyncHandler(async (req, res) => {
  const list = await MoveInModel.listShifting(req.user.sub);
  return success(res, list);
});

// POST /api/movein/utility
exports.requestUtility = asyncHandler(async (req, res) => {
  const { bookingId, utilityType } = req.body;
  const providerName = providerForUtility(utilityType);
  const expectedActivation = expectedActivationDate(new Date().toISOString().slice(0, 10));

  const reqRow = await MoveInModel.requestUtility({
    userId: req.user.sub, bookingId, utilityType, providerName, expectedActivation,
  });

  return success(
    res,
    reqRow,
    `Utility activation request submitted. Expected activation: ${expectedActivation}.`,
    201,
  );
});

// GET /api/movein/utilities
exports.listUtilities = asyncHandler(async (req, res) => {
  const list = await MoveInModel.listUtilities(req.user.sub);
  return success(res, list);
});

// GET /api/movein/interior-partners
exports.listInteriorPartners = asyncHandler(async (req, res) => {
  const partners = await MoveInModel.listInteriorPartners();
  return success(res, partners);
});

// POST /api/movein/interior-referral
exports.requestReferral = asyncHandler(async (req, res) => {
  const { partnerId, note } = req.body;
  const referral = await MoveInModel.requestReferral({ userId: req.user.sub, partnerId, note });
  if (!referral) throw new AppError('Interior partner not found', 404);

  return success(
    res,
    referral,
    `Interior partner referral sent to ${referral.partnerName} at ${referral.partnerPhone}.`,
    201,
  );
});
