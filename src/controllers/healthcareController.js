const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const HealthcareModel = require('../models/HealthcareModel');
const { validateApptDate, isValidAge } = require('../utils/healthcare');

// GET /api/healthcare/doctors?specialty=Cardiologist
exports.getDoctors = asyncHandler(async (req, res) => {
  const specialty = req.query.specialty ? String(req.query.specialty) : undefined;
  const doctors = await HealthcareModel.listDoctors({ specialty });
  return success(res, doctors);
});

// GET /api/healthcare/slots/:doctorId/:date
exports.getSlots = asyncHandler(async (req, res) => {
  const doctorId = Number(req.params.doctorId);
  const date = String(req.params.date);
  const dc = validateApptDate(date);
  if (!dc.ok) return success(res, { date, slots: [], blocked: true, reason: dc.reason });
  const slots = await HealthcareModel.getSlots(doctorId, date);
  return success(res, { date, slots });
});

// POST /api/healthcare/appointment
exports.book = asyncHandler(async (req, res) => {
  const { doctorId, consultationType, specialty, date, timeSlot, symptoms, patientName, patientAge } = req.body;

  const dc = validateApptDate(date);
  if (!dc.ok) throw new AppError(dc.reason, 400);
  if (!isValidAge(patientAge)) throw new AppError('Patient age must be between 1 and 120', 400);

  const slots = await HealthcareModel.getSlots(doctorId, date);
  if (!slots.includes(timeSlot)) {
    throw new AppError('Doctor not available at selected time. Please choose another slot.', 409);
  }

  const appt = await HealthcareModel.book({
    userId: req.user.sub, doctorId, consultationType, specialty, date, timeSlot, symptoms, patientName, patientAge,
  });

  return success(
    res,
    appt,
    `Appointment confirmed on ${date} at ${timeSlot}. Code ${appt.appointmentCode}.`,
    201,
  );
});

// GET /api/healthcare/appointments
exports.listMine = asyncHandler(async (req, res) => {
  const list = await HealthcareModel.listMyAppointments(req.user.sub);
  return success(res, list);
});

// POST /api/healthcare/medicine-order
exports.orderMedicine = asyncHandler(async (req, res) => {
  const { items, deliveryNote } = req.body;
  const order = await HealthcareModel.orderMedicine({ userId: req.user.sub, items, deliveryNote });
  return success(res, order, 'Medicine order placed. Delivery in 2-4 hours.', 201);
});
