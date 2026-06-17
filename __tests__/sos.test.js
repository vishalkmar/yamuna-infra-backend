const {
  RELATIONS, BLOOD_GROUPS, SOS_ACTIONS,
  isValidMobile, isValidBloodGroup, isValidRelation, validateContact, makeRequestCode, etaMinutes,
} = require('../src/utils/sos');

describe('sos constants', () => {
  it('exposes blueprint relations / blood groups / actions', () => {
    expect(RELATIONS).toEqual(expect.arrayContaining(['son', 'daughter', 'spouse', 'sibling']));
    expect(BLOOD_GROUPS).toEqual(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']);
    expect(SOS_ACTIONS).toEqual(expect.arrayContaining(['ambulance', 'family_notify']));
  });
});

describe('validators', () => {
  it('isValidMobile: 10-digit starting 6-9', () => {
    expect(isValidMobile('9876543210')).toBe(true);
    expect(isValidMobile('5876543210')).toBe(false);
    expect(isValidMobile('98765')).toBe(false);
  });
  it('isValidBloodGroup / isValidRelation', () => {
    expect(isValidBloodGroup('O+')).toBe(true);
    expect(isValidBloodGroup('C+')).toBe(false);
    expect(isValidRelation('spouse')).toBe(true);
    expect(isValidRelation('friend-ish')).toBe(false);
  });
});

describe('validateContact', () => {
  it('accepts a well-formed contact', () => {
    expect(validateContact({ name: 'Ramesh', phone: '9876543210', relation: 'son' })).toEqual({ ok: true });
  });
  it.each([
    ['short name', { name: 'Ra', phone: '9876543210', relation: 'son' }],
    ['bad phone', { name: 'Ramesh', phone: '123', relation: 'son' }],
    ['bad relation', { name: 'Ramesh', phone: '9876543210', relation: 'buddy' }],
    ['null', null],
  ])('rejects: %s', (_, c) => {
    expect(validateContact(c).ok).toBe(false);
  });
});

describe('makeRequestCode / etaMinutes', () => {
  it('request code matches SOS-YYYY-NNNNNN', () => {
    const code = makeRequestCode(new Date('2026-06-07'), () => 0.5);
    expect(code).toMatch(/^SOS-2026-\d{6}$/);
  });
  it('eta is bounded 5–20 minutes', () => {
    expect(etaMinutes(0)).toBe(5);
    expect(etaMinutes(0.999999)).toBeLessThanOrEqual(20);
    expect(etaMinutes(0.5)).toBeGreaterThanOrEqual(5);
  });
});
