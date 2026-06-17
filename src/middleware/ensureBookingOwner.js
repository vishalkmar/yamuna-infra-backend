const AppError = require('../utils/AppError');
const BookingModel = require('../models/BookingModel');

// Must run AFTER requireAuth. Looks at :bookingId in the URL and confirms
// req.user.sub is listed as an owner in booking_owners.
async function ensureBookingOwner(req, res, next) {
  try {
    const bookingCode = req.params.bookingId;
    if (!bookingCode) return next(new AppError('Missing bookingId in URL', 400));
    if (!req.user?.sub) return next(new AppError('Authentication required', 401));

    const owner = await BookingModel.isOwner(bookingCode, req.user.sub);
    if (!owner) {
      return next(new AppError('You do not have access to this booking', 403));
    }
    return next();
  } catch (e) {
    return next(e);
  }
}

module.exports = ensureBookingOwner;
