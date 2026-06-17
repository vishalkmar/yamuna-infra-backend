const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const SnagModel = require('../models/SnagModel');
const { canSignOff } = require('../utils/snag');

// POST /api/snag/:bookingId/report
exports.report = asyncHandler(async (req, res) => {
  const bookingCode = req.params.bookingId;
  const { location, defectType, description, severity, photos } = req.body;

  const snag = await SnagModel.report({ bookingCode, location, defectType, description, severity, photos });
  if (!snag) throw new AppError('Booking not found', 404);

  return success(
    res,
    { id: snag.id, snagCode: snag.snagCode },
    `Snag #${snag.snagCode} reported. Will be resolved before possession.`,
    201,
  );
});

// GET /api/snag/:bookingId/list
exports.list = asyncHandler(async (req, res) => {
  const bookingCode = req.params.bookingId;
  const status = req.query.status ? String(req.query.status) : undefined;
  const snags = await SnagModel.listForBooking(bookingCode, { status });
  return success(res, snags);
});

// PATCH /api/snag/:bookingId/:snagId/signoff
exports.signoff = asyncHandler(async (req, res) => {
  const bookingCode = req.params.bookingId;
  const snagId = Number(req.params.snagId);

  const snag = await SnagModel.findSnag(snagId);
  if (!snag) throw new AppError('Snag not found', 404);
  if (snag.bookingCode !== bookingCode) throw new AppError('Snag does not belong to this booking', 403);
  if (!canSignOff(snag.status)) {
    throw new AppError('Only resolved snags can be signed off.', 409);
  }

  await SnagModel.signoff(snagId);
  return success(res, { id: snagId, status: 'signed_off' }, 'Signed off. Thank you for confirming the fix!');
});
