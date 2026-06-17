const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const adminAuthService = require('../services/adminAuthService');

// POST /api/admin/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const data = await adminAuthService.login(email, password);
  return success(res, data, 'Login successful');
});

// GET /api/admin/auth/me
exports.me = asyncHandler(async (req, res) => {
  const admin = await adminAuthService.me(req.admin.sub);
  return success(res, admin);
});

// POST /api/admin/auth/change-password
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const data = await adminAuthService.changePassword(req.admin.sub, currentPassword, newPassword);
  return success(res, data, 'Password changed');
});
