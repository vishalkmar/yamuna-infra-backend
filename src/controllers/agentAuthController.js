const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const agentAuthService = require('../services/agentAuthService');

// POST /api/agent/auth/register
exports.register = asyncHandler(async (req, res) => {
  const data = await agentAuthService.register(req.body);
  return success(res, data, 'Registration received — pending admin approval', 201);
});

// POST /api/agent/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const data = await agentAuthService.login(email, password);
  return success(res, data, 'Login successful');
});

// GET /api/agent/auth/me
exports.me = asyncHandler(async (req, res) => {
  const agent = await agentAuthService.me(req.agent.sub);
  return success(res, agent);
});

// POST /api/agent/auth/change-password
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const data = await agentAuthService.changePassword(req.agent.sub, currentPassword, newPassword);
  return success(res, data, 'Password changed');
});
