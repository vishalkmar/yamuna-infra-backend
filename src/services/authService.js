const crypto = require('crypto');
const config = require('../config/env');
const OtpModel = require('../models/OtpModel');
const UserModel = require('../models/UserModel');
const AppError = require('../utils/AppError');
const { signToken } = require('../middleware/auth');
const { sendSms } = require('./smsService');
const { sendEmail } = require('./emailService');

function generateOtp() {
  const max = 10 ** config.otp.length;
  const min = 10 ** (config.otp.length - 1);
  return String(crypto.randomInt(min, max));
}

// ---------- App-store review account ----------
// A store reviewer can't read our inbox or receive our SMS, so the one account
// named in DEMO_LOGIN_* accepts a fixed code. Everything else about the login
// is unchanged: the resident must still exist and be active, and the fixed code
// is rejected for every other identifier. Unset DEMO_LOGIN_OTP to disable.
function demoEnabled() {
  return Boolean(config.demoLogin.otp);
}
function isDemoEmail(id) {
  return demoEnabled() && Boolean(config.demoLogin.email) && id === config.demoLogin.email;
}
function isDemoMobile(mobile) {
  return demoEnabled() && Boolean(config.demoLogin.mobile) && mobile === config.demoLogin.mobile;
}
// Timing-safe compare so the fixed code can't be guessed byte by byte.
function codeMatches(submitted, expected) {
  const a = Buffer.from(String(submitted));
  const b = Buffer.from(String(expected));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Shared tail of a successful login: refresh the booking link and mint a token.
async function finalizeLogin(user, extraClaim) {
  const synced = await UserModel.syncPrimaryBookingId(user.id);
  if (synced) user.primary_booking_id = synced;
  const token = signToken({ sub: user.id, ...extraClaim });
  return {
    token,
    user: {
      id: user.id,
      mobile: user.mobile,
      name: user.name,
      email: user.email,
      bookingId: user.primary_booking_id,
    },
  };
}

function assertLoginable(user, what) {
  if (!user) throw new AppError(`No resident account found for this ${what}. Please contact the office.`, 404);
  if (user.is_active === 0) throw new AppError('Your account is inactive. Please contact the office.', 403);
}

async function sendOtp(mobile) {
  // Residents are created by the admin portal — only a known, active account
  // may receive an OTP. No self-registration.
  const user = await UserModel.findByMobile(mobile);
  if (!user) {
    throw new AppError('No resident account found for this number. Please contact the office.', 404);
  }
  if (user.is_active === 0) {
    throw new AppError('Your account is inactive. Please contact the office.', 403);
  }

  // Review account: nothing to send, the code is fixed.
  if (isDemoMobile(mobile)) {
    return { sent: true, expiresInSeconds: config.otp.ttlSeconds };
  }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + config.otp.ttlSeconds * 1000);

  await OtpModel.create({ mobile, code, expiresAt });
  await sendSms(mobile, `Your Yamuna Infra OTP is ${code}. It will expire in 5 minutes.`);

  return { sent: true, expiresInSeconds: config.otp.ttlSeconds };
}

async function verifyOtp(mobile, submittedCode) {
  if (isDemoMobile(mobile) && codeMatches(submittedCode, config.demoLogin.otp)) {
    const demoUser = await UserModel.findByMobile(mobile);
    assertLoginable(demoUser, 'number');
    return finalizeLogin(demoUser, { mobile: demoUser.mobile });
  }

  const record = await OtpModel.findLatestActive(mobile);
  if (!record) {
    throw new AppError('OTP expired or not requested. Please request a new one.', 400);
  }
  if (record.attempts >= 5) {
    throw new AppError('Too many failed attempts. Request a new OTP.', 429);
  }
  if (record.code !== submittedCode) {
    await OtpModel.incrementAttempts(record.id);
    throw new AppError('Invalid OTP. Please try again.', 400);
  }
  const user = await UserModel.findByMobile(mobile);
  if (!user) {
    throw new AppError('No resident account found. Please contact the office.', 404);
  }
  if (user.is_active === 0) {
    throw new AppError('Your account is inactive. Please contact the office.', 403);
  }
  await OtpModel.markConsumed(record.id);

  // If they've been linked to a booking since last login, pick it up.
  const synced = await UserModel.syncPrimaryBookingId(user.id);
  if (synced) user.primary_booking_id = synced;

  const token = signToken({ sub: user.id, mobile: user.mobile });
  return {
    token,
    user: {
      id: user.id,
      mobile: user.mobile,
      name: user.name,
      email: user.email,
      bookingId: user.primary_booking_id,
    },
  };
}

// ---------- Email OTP (Task 4) — used when the app runs on the real backend ----------
// The otps table's `mobile` column doubles as a generic identifier (widened to
// 180 chars), so we reuse OtpModel keyed by the email address.
async function sendEmailOtp(email) {
  const id = String(email).toLowerCase().trim();

  // Only an admin-created, active resident may log in. No self-registration.
  const user = await UserModel.findByEmail(id);
  if (!user) {
    throw new AppError('No resident account found for this email. Please contact the office.', 404);
  }
  if (user.is_active === 0) {
    throw new AppError('Your account is inactive. Please contact the office.', 403);
  }

  // Review account: nothing to send, the code is fixed.
  if (isDemoEmail(id)) {
    return { sent: true, expiresInSeconds: config.otp.ttlSeconds };
  }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + config.otp.ttlSeconds * 1000);
  await OtpModel.create({ mobile: id, code, expiresAt });
  const result = await sendEmail(
    id,
    'Your Yamuna Infra login code',
    `Your OTP is ${code}. It expires in 5 minutes.`,
    `<p>Your Yamuna Infra OTP is <b style="font-size:20px">${code}</b>.</p><p>It expires in 5 minutes.</p>`,
  );
  // Only report success if the email was ACTUALLY accepted for delivery.
  // Otherwise the app must show an error (no fake "OTP sent").
  if (!result || !result.delivered) {
    console.warn('[auth] email OTP not delivered to', id, '-', result && result.reason);
    throw new AppError('Could not send the OTP email. Please check the address and try again.', 502);
  }
  return { sent: true, expiresInSeconds: config.otp.ttlSeconds };
}

async function verifyEmailOtp(email, submittedCode) {
  const id = String(email).toLowerCase().trim();

  if (isDemoEmail(id) && codeMatches(submittedCode, config.demoLogin.otp)) {
    const demoUser = await UserModel.findByEmail(id);
    assertLoginable(demoUser, 'email');
    return finalizeLogin(demoUser, { email: demoUser.email });
  }

  const record = await OtpModel.findLatestActive(id);
  if (!record) throw new AppError('OTP expired or not requested. Please request a new one.', 400);
  if (record.attempts >= 5) throw new AppError('Too many failed attempts. Request a new OTP.', 429);
  if (record.code !== submittedCode) {
    await OtpModel.incrementAttempts(record.id);
    throw new AppError('Invalid OTP. Please try again.', 400);
  }
  const user = await UserModel.findByEmail(id);
  if (!user) {
    throw new AppError('No resident account found. Please contact the office.', 404);
  }
  if (user.is_active === 0) {
    throw new AppError('Your account is inactive. Please contact the office.', 403);
  }
  await OtpModel.markConsumed(record.id);

  const synced = await UserModel.syncPrimaryBookingId(user.id);
  if (synced) user.primary_booking_id = synced;

  const token = signToken({ sub: user.id, email: user.email });
  return {
    token,
    user: { id: user.id, mobile: user.mobile, name: user.name, email: user.email, bookingId: user.primary_booking_id },
  };
}

module.exports = { sendOtp, verifyOtp, sendEmailOtp, verifyEmailOtp };
