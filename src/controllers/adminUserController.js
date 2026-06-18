const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const AdminUserModel = require('../models/AdminUserModel');
const PaymentPlanModel = require('../models/PaymentPlanModel');

// Create a payment plan + generate the installment schedule for a property.
async function applyPlan(propertyId, plan) {
  if (!plan) return;
  if (!plan.totalAmount && !plan.installmentCount && !plan.downpayment) return;
  await PaymentPlanModel.upsertPlan(propertyId, plan);
  await PaymentPlanModel.generateInstallments(propertyId);
}

// GET /api/admin/users?search=&kyc=&active=&page=&pageSize=
exports.list = asyncHandler(async (req, res) => {
  const { search, kyc, active, page, pageSize } = req.query;
  const result = await AdminUserModel.list({ search, kyc, active, page, pageSize });
  return success(res, result);
});

// GET /api/admin/users/:id
exports.detail = asyncHandler(async (req, res) => {
  const user = await AdminUserModel.getById(req.params.id);
  if (!user) throw new AppError('Resident not found', 404);
  return success(res, user);
});

// POST /api/admin/users  — create a resident (admin-managed onboarding)
exports.create = asyncHandler(async (req, res) => {
  const { mobile, email } = req.body;
  if (await AdminUserModel.findByMobile(mobile)) {
    throw new AppError('A resident with this phone number already exists', 409);
  }
  if (email && (await AdminUserModel.findByEmail(email.toLowerCase()))) {
    throw new AppError('A resident with this email already exists', 409);
  }
  const user = await AdminUserModel.create({ ...req.body, email: email ? email.toLowerCase() : null });
  // Generate payment schedules for any properties that came with a plan.
  const inputProps = req.body.properties || [];
  for (let i = 0; i < (user.properties || []).length; i++) {
    await applyPlan(user.properties[i].id, inputProps[i] && inputProps[i].plan);
  }
  return success(res, user, 'Resident created', 201);
});

// PUT /api/admin/users/:id  — update core fields + self-address
exports.update = asyncHandler(async (req, res) => {
  const existing = await AdminUserModel.getById(req.params.id);
  if (!existing) throw new AppError('Resident not found', 404);
  const { mobile, email } = req.body;
  if (mobile) {
    const other = await AdminUserModel.findByMobile(mobile);
    if (other && Number(other.id) !== Number(req.params.id)) {
      throw new AppError('Another resident already uses this phone number', 409);
    }
  }
  if (email) {
    const other = await AdminUserModel.findByEmail(email.toLowerCase());
    if (other && Number(other.id) !== Number(req.params.id)) {
      throw new AppError('Another resident already uses this email', 409);
    }
  }
  const user = await AdminUserModel.update(req.params.id, { ...req.body, email: email ? email.toLowerCase() : undefined });
  return success(res, user, 'Resident updated');
});

// DELETE /api/admin/users/:id
exports.remove = asyncHandler(async (req, res) => {
  const ok = await AdminUserModel.remove(req.params.id);
  if (!ok) throw new AppError('Resident not found', 404);
  return success(res, { id: Number(req.params.id) }, 'Resident deleted');
});

// ----- Properties (a resident can own one or more flats) -----
// POST /api/admin/users/:id/properties
exports.addProperty = asyncHandler(async (req, res) => {
  const user = await AdminUserModel.getById(req.params.id);
  if (!user) throw new AppError('Resident not found', 404);
  const newPropertyId = await AdminUserModel.addProperty(req.params.id, req.body);
  await applyPlan(newPropertyId, req.body.plan);
  return success(res, await AdminUserModel.listProperties(req.params.id), 'Property added', 201);
});

// PUT /api/admin/users/:id/properties/:propertyId
exports.updateProperty = asyncHandler(async (req, res) => {
  const ok = await AdminUserModel.updateProperty(req.params.id, req.params.propertyId, req.body);
  if (!ok) throw new AppError('Property not found', 404);
  return success(res, await AdminUserModel.listProperties(req.params.id), 'Property updated');
});

// DELETE /api/admin/users/:id/properties/:propertyId
exports.removeProperty = asyncHandler(async (req, res) => {
  const ok = await AdminUserModel.removeProperty(req.params.id, req.params.propertyId);
  if (!ok) throw new AppError('Property not found', 404);
  return success(res, await AdminUserModel.listProperties(req.params.id), 'Property removed');
});

// GET /api/admin/users/:id/bookings  (combined activity feed)
exports.bookings = asyncHandler(async (req, res) => {
  const user = await AdminUserModel.getById(req.params.id);
  if (!user) throw new AppError('Resident not found', 404);
  const items = await AdminUserModel.activity(req.params.id);
  return success(res, items);
});

// POST /api/admin/users/:id/status  { active, notes? }
exports.setStatus = asyncHandler(async (req, res) => {
  const { active, notes } = req.body;
  const ok = await AdminUserModel.setStatus(req.params.id, active);
  if (!ok) throw new AppError('Resident not found', 404);
  if (notes !== undefined) await AdminUserModel.setNotes(req.params.id, notes);
  return success(res, { id: Number(req.params.id), isActive: active ? 1 : 0 },
    active ? 'Resident unblocked' : 'Resident blocked');
});

// POST /api/admin/users/:id/notes  { notes }
exports.setNotes = asyncHandler(async (req, res) => {
  const ok = await AdminUserModel.setNotes(req.params.id, req.body.notes);
  if (!ok) throw new AppError('Resident not found', 404);
  return success(res, { id: Number(req.params.id) }, 'Notes saved');
});

// POST /api/admin/users/:id/kyc/:action  (action = approve | reject), { reason? }
exports.reviewKyc = asyncHandler(async (req, res) => {
  const { action } = req.params;
  if (!['approve', 'reject'].includes(action)) throw new AppError('Invalid action', 400);
  const ok = await AdminUserModel.reviewKyc(req.params.id, action, req.body.reason);
  if (!ok) throw new AppError('Resident not found', 404);
  return success(res, { id: Number(req.params.id), kycStatus: action === 'approve' ? 'approved' : 'rejected' },
    `KYC ${action === 'approve' ? 'approved' : 'rejected'}`);
});
