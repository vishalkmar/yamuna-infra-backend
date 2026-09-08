// The store-review account signs in with a fixed code. These tests pin down the
// blast radius: the fixed code must work for that one resident and for nobody
// else, and it must stay off entirely when DEMO_LOGIN_OTP is unset.

const DEMO_EMAIL = 'playstore.review@yamunainfra.com';
const DEMO_MOBILE = '9000000001';
const DEMO_OTP = '181948';

const demoUser = {
  id: 99, mobile: DEMO_MOBILE, name: 'Play Store Review',
  email: DEMO_EMAIL, is_active: 1, primary_booking_id: null,
};
const realUser = {
  id: 20, mobile: '9540792427', name: 'Vishal kumar',
  email: 'vk722413@gmail.com', is_active: 1, primary_booking_id: null,
};

// Load authService with a given demo config and fully mocked collaborators.
// The mocks are returned alongside it: requiring them outside isolateModules
// hands back a different registry entry, so call counts would bleed between tests.
function load({ email = DEMO_EMAIL, mobile = DEMO_MOBILE, otp = DEMO_OTP } = {}) {
  let mod, sms, mail;
  jest.isolateModules(() => {
    jest.doMock('../src/config/env', () => ({
      otp: { length: 6, ttlSeconds: 300 },
      jwt: { secret: 'test-secret', expiresIn: '7d' },
      demoLogin: { email, mobile, otp },
    }));
    jest.doMock('../src/models/UserModel', () => ({
      findByEmail: jest.fn(async e => (e === DEMO_EMAIL ? demoUser : e === realUser.email ? realUser : null)),
      findByMobile: jest.fn(async m => (m === DEMO_MOBILE ? demoUser : m === realUser.mobile ? realUser : null)),
      syncPrimaryBookingId: jest.fn(async () => null),
    }));
    jest.doMock('../src/models/OtpModel', () => ({
      create: jest.fn(async () => ({ id: 1 })),
      findLatestActive: jest.fn(async () => null), // no delivered OTP on record
      incrementAttempts: jest.fn(),
      markConsumed: jest.fn(),
    }));
    jest.doMock('../src/services/smsService', () => ({ sendSms: jest.fn(async () => ({ delivered: true })) }));
    jest.doMock('../src/services/emailService', () => ({ sendEmail: jest.fn(async () => ({ delivered: true })) }));
    mod = require('../src/services/authService');
    sms = require('../src/services/smsService');
    mail = require('../src/services/emailService');
  });
  return { auth: mod, sendSms: sms.sendSms, sendEmail: mail.sendEmail };
}

describe('store-review account — email login', () => {
  it('signs in with the fixed code', async () => {
    const { auth } = load();
    const r = await auth.verifyEmailOtp(DEMO_EMAIL, DEMO_OTP);
    expect(r.token).toBeTruthy();
    expect(r.user.email).toBe(DEMO_EMAIL);
  });

  it('is case-insensitive on the address, like the normal flow', async () => {
    const { auth } = load();
    const r = await auth.verifyEmailOtp('PlayStore.Review@YamunaInfra.com', DEMO_OTP);
    expect(r.user.id).toBe(99);
  });

  it('sends no email for the review account but still reports sent', async () => {
    const { auth, sendEmail } = load();
    await expect(auth.sendEmailOtp(DEMO_EMAIL)).resolves.toMatchObject({ sent: true });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('rejects a wrong code for the review account', async () => {
    const { auth } = load();
    await expect(auth.verifyEmailOtp(DEMO_EMAIL, '000000')).rejects.toThrow(/expired or not requested/i);
  });
});

describe('store-review account — mobile login', () => {
  it('signs in with the fixed code', async () => {
    const { auth } = load();
    const r = await auth.verifyOtp(DEMO_MOBILE, DEMO_OTP);
    expect(r.token).toBeTruthy();
    expect(r.user.mobile).toBe(DEMO_MOBILE);
  });

  it('sends no SMS for the review account', async () => {
    const { auth, sendSms } = load();
    await expect(auth.sendOtp(DEMO_MOBILE)).resolves.toMatchObject({ sent: true });
    expect(sendSms).not.toHaveBeenCalled();
  });
});

describe('blast radius', () => {
  // The whole point: the fixed code must not become a master key.
  it('does not let the fixed code log in a different resident by email', async () => {
    const { auth } = load();
    await expect(auth.verifyEmailOtp(realUser.email, DEMO_OTP)).rejects.toThrow(/expired or not requested/i);
  });

  it('does not let the fixed code log in a different resident by mobile', async () => {
    const { auth } = load();
    await expect(auth.verifyOtp(realUser.mobile, DEMO_OTP)).rejects.toThrow(/expired or not requested/i);
  });

  it('still delivers a real OTP to ordinary accounts', async () => {
    const { auth, sendEmail } = load();
    await auth.sendEmailOtp(realUser.email);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('is disabled entirely when DEMO_LOGIN_OTP is unset', async () => {
    const { auth, sendEmail } = load({ otp: '' });
    await expect(auth.verifyEmailOtp(DEMO_EMAIL, DEMO_OTP)).rejects.toThrow(/expired or not requested/i);
    await auth.sendEmailOtp(DEMO_EMAIL);
    expect(sendEmail).toHaveBeenCalledTimes(1); // falls back to a real delivered OTP
  });

  it('refuses an inactive review account', async () => {
    demoUser.is_active = 0;
    const { auth } = load();
    await expect(auth.verifyEmailOtp(DEMO_EMAIL, DEMO_OTP)).rejects.toThrow(/inactive/i);
    demoUser.is_active = 1;
  });
});
