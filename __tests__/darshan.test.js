const {
  TRANSPORT_TYPES, VISIT_SLOTS, SPECIAL_PUJAS, CROWD_LEVELS,
  validateDarshanDate, validateSeniors, makeDarshanCode,
} = require('../src/utils/darshan');

const NOW = new Date('2026-06-07T08:00:00Z');

describe('darshan constants', () => {
  it('exposes transport, slots, pujas, crowd levels', () => {
    expect(TRANSPORT_TYPES).toEqual(expect.arrayContaining(['shared_shuttle', 'private_taxi', 'e_rickshaw', 'walking_group']));
    expect(VISIT_SLOTS).toEqual(['morning', 'afternoon', 'evening']);
    expect(SPECIAL_PUJAS).toEqual(['abhishek', 'bhog', 'seva']);
    expect(CROWD_LEVELS).toEqual(['low', 'moderate', 'high', 'very_high']);
  });
});

describe('validateDarshanDate', () => {
  it('allows today (same-day) and future', () => {
    expect(validateDarshanDate('2026-06-07', { now: NOW })).toEqual({ ok: true });
    expect(validateDarshanDate('2026-06-20', { now: NOW })).toEqual({ ok: true });
  });
  it('rejects past and bad format', () => {
    expect(validateDarshanDate('2026-06-06', { now: NOW }).ok).toBe(false);
    expect(validateDarshanDate('bad', { now: NOW }).ok).toBe(false);
  });
});

describe('validateSeniors', () => {
  it('seniors must be 0..persons', () => {
    expect(validateSeniors(2, 5)).toEqual({ ok: true });
    expect(validateSeniors(0, 1)).toEqual({ ok: true });
    expect(validateSeniors(6, 5).ok).toBe(false);
    expect(validateSeniors(-1, 5).ok).toBe(false);
  });
});

describe('makeDarshanCode', () => {
  it('matches DSN-YYYY-NNNNN', () => {
    expect(makeDarshanCode(NOW, () => 0.5)).toMatch(/^DSN-2026-\d{5}$/);
  });
});
