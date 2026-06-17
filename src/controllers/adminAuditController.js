const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const M = require('../models/AdminAuditModel');

// ---------- Audit log ----------
exports.list = asyncHandler(async (req, res) => {
  const { adminId, entity, action, from, to, page, pageSize } = req.query;
  return success(res, await M.list({ adminId, entity, action, from, to, page, pageSize }));
});

// ---------- Admin team ----------
exports.listAdmins = asyncHandler(async (req, res) => success(res, await M.listAdmins()));

exports.createAdmin = asyncHandler(async (req, res) => {
  const r = await M.createAdmin(req.body);
  if (r.conflict) throw new AppError('An admin with that email already exists', 409);
  return success(res, r, 'Admin created', 201);
});

exports.updateAdmin = asyncHandler(async (req, res) => {
  // Prevent an admin from locking themselves out (deactivating own account).
  if (Number(req.params.id) === Number(req.admin.sub) && req.body.isActive === false) {
    throw new AppError('You cannot deactivate your own account', 400);
  }
  const ok = await M.updateAdmin(req.params.id, req.body);
  if (!ok) throw new AppError('Admin not found', 404);
  return success(res, { id: Number(req.params.id) }, 'Admin updated');
});
