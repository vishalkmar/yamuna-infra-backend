const { RELATIONSHIPS, PROJECT_STATUSES, REFERRAL_REWARD, validateReferral, canRedeem } = require('../src/utils/rewards');

describe('rewards constants', () => {
  it('exposes relationships, project statuses, reward', () => {
    expect(RELATIONSHIPS).toEqual(['friend', 'relative', 'colleague', 'neighbor']);
    expect(PROJECT_STATUSES).toEqual(['pre_launch', 'launching', 'open']);
    expect(REFERRAL_REWARD).toBe(25000);
  });
});

describe('validateReferral', () => {
  it('accepts a well-formed referral', () => {
    expect(validateReferral({ refereeName: 'Amit Shah', refereePhone: '9876543210', relationship: 'friend' })).toEqual({ ok: true });
  });
  it('accepts optional valid email', () => {
    expect(validateReferral({ refereeName: 'Amit Shah', refereePhone: '9876543210', refereeEmail: 'a@b.com', relationship: 'relative' }).ok).toBe(true);
  });
  it.each([
    ['short name', { refereeName: 'Am', refereePhone: '9876543210', relationship: 'friend' }],
    ['bad phone', { refereeName: 'Amit', refereePhone: '123', relationship: 'friend' }],
    ['bad email', { refereeName: 'Amit', refereePhone: '9876543210', refereeEmail: 'nope', relationship: 'friend' }],
    ['bad relationship', { refereeName: 'Amit', refereePhone: '9876543210', relationship: 'stranger' }],
  ])('rejects: %s', (_, r) => {
    expect(validateReferral(r).ok).toBe(false);
  });
});

describe('canRedeem', () => {
  it('true only when balance covers a positive cost', () => {
    expect(canRedeem(1500, 500)).toBe(true);
    expect(canRedeem(300, 500)).toBe(false);
    expect(canRedeem(1500, 0)).toBe(false);
  });
});
