const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const AdminUserModel = require('../models/AdminUserModel');

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
