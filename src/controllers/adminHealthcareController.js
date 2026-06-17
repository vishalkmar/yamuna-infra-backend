const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const M = require('../models/AdminHealthcareModel');

const APPT_STATUSES = ['booked', 'completed', 'cancelled', 'no_show'];
const MED_STATUSES = ['placed', 'out_for_delivery', 'delivered', 'cancelled'];

// ---------- Specialties ----------
exports.listSpecialties = asyncHandler(async (req, res) => success(res, await M.listSpecialties()));
exports.createSpecialty = asyncHandler(async (req, res) => success(res, await M.createSpecialty(req.body), 'Specialty created', 201));
exports.updateSpecialty = asyncHandler(async (req, res) => {
  const ok = await M.updateSpecialty(req.params.id, req.body);
  if (!ok) throw new AppError('Specialty not found', 404);
  return success(res, { id: Number(req.params.id) }, 'Specialty updated');
});
exports.deleteSpecialty = asyncHandler(async (req, res) => {
  const r = await M.deleteSpecialty(req.params.id);
  if (r.blocked) throw new AppError(`Cannot delete: ${r.doctorCount} doctor(s) use this specialty.`, 409);
  if (!r.deleted) throw new AppError('Specialty not found', 404);
  return success(res, null, 'Specialty deleted');
});

// ---------- Doctors ----------
exports.listDoctors = asyncHandler(async (req, res) =>
  success(res, await M.listDoctors({ specialtyId: req.query.specialtyId, search: req.query.search })));
exports.createDoctor = asyncHandler(async (req, res) => success(res, await M.createDoctor(req.body), 'Doctor created', 201));
exports.updateDoctor = asyncHandler(async (req, res) => {
  const ok = await M.updateDoctor(req.params.id, req.body);
  if (!ok) throw new AppError('Doctor not found', 404);
  return success(res, { id: Number(req.params.id) }, 'Doctor updated');
});
exports.deleteDoctor = asyncHandler(async (req, res) => {
  const ok = await M.deleteDoctor(req.params.id);
  if (!ok) throw new AppError('Doctor not found', 404);
  return success(res, null, 'Doctor deleted');
});

// ---------- Appointments ----------
exports.listAppointments = asyncHandler(async (req, res) => {
  const { status, page, pageSize } = req.query;
  return success(res, await M.listAppointments({ status, page, pageSize }));
});
exports.updateAppointmentStatus = asyncHandler(async (req, res) => {
  if (!APPT_STATUSES.includes(req.body.status)) throw new AppError('Invalid status', 400);
  const ok = await M.updateAppointmentStatus(req.params.id, req.body.status);
  if (!ok) throw new AppError('Appointment not found', 404);
  return success(res, { id: Number(req.params.id), status: req.body.status }, 'Appointment updated');
});

// ---------- Medicine orders ----------
exports.listMedicineOrders = asyncHandler(async (req, res) => {
  const { status, page, pageSize } = req.query;
  return success(res, await M.listMedicineOrders({ status, page, pageSize }));
});
exports.updateMedicineOrderStatus = asyncHandler(async (req, res) => {
  if (!MED_STATUSES.includes(req.body.status)) throw new AppError('Invalid status', 400);
  const ok = await M.updateMedicineOrderStatus(req.params.id, req.body.status);
  if (!ok) throw new AppError('Order not found', 404);
  return success(res, { id: Number(req.params.id), status: req.body.status }, 'Order updated');
});
