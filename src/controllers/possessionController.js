const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const PossessionModel = require('../models/PossessionModel');
const {
  computeChecklistPct, derivePossessionStatus, statusLabel, isValidSlot,
} = require('../utils/possession');

// GET /api/possession/:bookingId/status
exports.getStatus = asyncHandler(async (req, res) => {
  const bookingCode = req.params.bookingId;

  const [checklist, documents, bookingStatus, appointment] = await Promise.all([
    PossessionModel.getChecklist(bookingCode),
    PossessionModel.getDocuments(bookingCode),
    PossessionModel.getBookingStatus(bookingCode),
    PossessionModel.getUpcomingAppointment(bookingCode),
  ]);

  const status = derivePossessionStatus({
    checklist,
    bookingStatus,
    hasUpcomingAppointment: !!appointment,
  });

  return success(res, {
    status,
    statusLabel: statusLabel(status),
    progressPct: computeChecklistPct(checklist),
    checklist,
    documents,
    appointment,
  });
});

// POST /api/possession/:bookingId/appointment
exports.bookAppointment = asyncHandler(async (req, res) => {
  const bookingCode = req.params.bookingId;
  const { appointmentDate, timeSlot, attendees, specialRequest } = req.body;

  if (!isValidSlot(timeSlot)) throw new AppError('Invalid time slot', 400);

  // Possession is only schedulable once the checklist clears.
  const checklist = await PossessionModel.getChecklist(bookingCode);
  const bookingStatus = await PossessionModel.getBookingStatus(bookingCode);
  const status = derivePossessionStatus({ checklist, bookingStatus, hasUpcomingAppointment: false });
  if (status === 'pending_clearance') {
    throw new AppError('Possession is not ready yet. Complete the checklist first.', 409);
  }

  const appt = await PossessionModel.bookAppointment({
    bookingCode, appointmentDate, timeSlot, attendees, specialRequest,
  });
  if (!appt) throw new AppError('Booking not found', 404);

  return success(
    res,
    appt,
    `Possession appointment confirmed for ${appointmentDate} at ${timeSlot}!`,
    201,
  );
});
