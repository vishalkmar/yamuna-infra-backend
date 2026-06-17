const bcrypt = require('bcryptjs');
const AdminModel = require('../models/AdminModel');
const AppError = require('../utils/AppError');
const { signAdminToken } = require('../middleware/requireAdmin');

function publicAdmin(row) {
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}

async function login(email, password) {
  const admin = await AdminModel.findByEmail(String(email).toLowerCase().trim());
  // Same generic error whether the email is unknown or the password is wrong.
  if (!admin || !admin.is_active) {
    throw new AppError('Invalid email or password', 401);
  }
  const ok = await bcrypt.compare(password, admin.password_hash);
  if (!ok) {
    throw new AppError('Invalid email or password', 401);
  }
  await AdminModel.touchLastLogin(admin.id);
  const token = signAdminToken({ sub: admin.id, role: admin.role, name: admin.name });
  return { token, admin: publicAdmin(admin) };
}

async function me(adminId) {
  const admin = await AdminModel.findById(adminId);
  if (!admin) throw new AppError('Admin not found', 404);
  return admin;
}

async function changePassword(adminId, currentPassword, newPassword) {
  const row = await AdminModel.findByIdWithHash(adminId);
  if (!row) throw new AppError('Admin not found', 404);
  const ok = await bcrypt.compare(currentPassword, row.password_hash);
  if (!ok) throw new AppError('Current password is incorrect', 400);
  const hash = await bcrypt.hash(newPassword, 10);
  await AdminModel.updatePasswordHash(adminId, hash);
  return { changed: true };
}

module.exports = { login, me, changePassword };
