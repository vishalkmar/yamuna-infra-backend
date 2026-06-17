const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const CommunityModel = require('../models/CommunityModel');
const {
  validateVisitDate, validateValidTill, validateAmenityDate, normalizeExtras,
} = require('../utils/community');

// ---- Community feed ----
exports.announcements = asyncHandler(async (req, res) => {
  return success(res, await CommunityModel.listAnnouncements());
});
exports.events = asyncHandler(async (req, res) => {
  return success(res, await CommunityModel.listEvents());
});

// ---- Visitor management ----
exports.preAuthorize = asyncHandler(async (req, res) => {
  const { guestName, guestPhone, visitDate, visitPurpose, validTill, vehicleNo } = req.body;

  const dc = validateVisitDate(visitDate);
  if (!dc.ok) throw new AppError(dc.reason, 400);
  const vt = validateValidTill(validTill, visitDate);
  if (!vt.ok) throw new AppError(vt.reason, 400);

  const pass = await CommunityModel.preAuthorize({
    userId: req.user.sub, guestName, guestPhone, visitDate, visitPurpose, validTill, vehicleNo,
  });
  return success(res, pass, `Guest pass generated! QR code sent to ${guestName} on WhatsApp.`, 201);
});

exports.visitorHistory = asyncHandler(async (req, res) => {
  return success(res, await CommunityModel.visitorHistory(req.user.sub));
});

// ---- Amenities ----
exports.listAmenities = asyncHandler(async (req, res) => {
  return success(res, await CommunityModel.listAmenities());
});

exports.amenitySlots = asyncHandler(async (req, res) => {
  const amenityId = Number(req.params.facilityId);
  const date = String(req.query.date || '');
  const dc = validateAmenityDate(date);
  if (!dc.ok) return success(res, { date, slots: [], blocked: true, reason: dc.reason });
  if (await CommunityModel.isBlackedOut(amenityId, date)) {
    return success(res, { date, slots: [], blocked: true, reason: 'Selected facility is under maintenance on this date.' });
  }
  const slots = await CommunityModel.getAmenitySlots(amenityId, date);
  return success(res, { date, slots });
});

exports.bookAmenity = asyncHandler(async (req, res) => {
  const { amenityId, bookingDate, timeSlot, occasion, extraServices, guestCount } = req.body;

  const dc = validateAmenityDate(bookingDate);
  if (!dc.ok) throw new AppError(dc.reason, 400);

  const amenity = await CommunityModel.getAmenity(amenityId);
  if (!amenity) throw new AppError('Facility not found', 404);
  if (await CommunityModel.isBlackedOut(amenityId, bookingDate)) {
    throw new AppError('Selected facility is under maintenance on this date.', 409);
  }
  if (guestCount > amenity.capacity) {
    throw new AppError(`Guest count exceeds capacity (${amenity.capacity}).`, 400);
  }
  const slots = await CommunityModel.getAmenitySlots(amenityId, bookingDate);
  if (!slots.includes(timeSlot)) {
    throw new AppError('Selected slot is no longer available. Please choose another.', 409);
  }

  const booking = await CommunityModel.bookAmenity({
    userId: req.user.sub, amenityId, bookingDate, timeSlot, occasion,
    extraServices: normalizeExtras(extraServices), guestCount,
  });

  const deposit = Number(amenity.deposit) || 0;
  const message = deposit > 0
    ? `${amenity.name} booked for ${bookingDate}! A deposit of ₹${deposit} is required to confirm.`
    : `${amenity.name} booked for ${bookingDate} ${timeSlot}. Booking ID: ${booking.bookingCode}.`;
  return success(res, { ...booking, deposit }, message, 201);
});

exports.myAmenityBookings = asyncHandler(async (req, res) => {
  return success(res, await CommunityModel.listMyAmenityBookings(req.user.sub));
});
