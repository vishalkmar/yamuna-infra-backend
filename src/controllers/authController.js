const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const authService = require('../services/authService');

exports.sendOtp = asyncHandler(async (req, res) => {
  const { mobile } = req.body;
  const data = await authService.sendOtp(mobile);
  return success(res, data, `OTP sent to +91 ${mobile}`);
});

exports.verifyOtp = asyncHandler(async (req, res) => {
  const { mobile, otp } = req.body;
  const data = await authService.verifyOtp(mobile, otp);
  return success(res, data, 'Login successful');
});

exports.sendEmailOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const data = await authService.sendEmailOtp(email);
  return success(res, data, `OTP sent to ${email}`);
});

exports.verifyEmailOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const data = await authService.verifyEmailOtp(email, otp);
  return success(res, data, 'Login successful');
});

exports.me = asyncHandler(async (req, res) => {
  return success(res, { user: req.user });
});
