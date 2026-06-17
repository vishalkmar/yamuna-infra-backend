const {
  DURATIONS, THERAPIST_GENDERS, DAY_SLOTS,
  validateWellnessDate, isValidDuration, availableSlots,
} = require('../src/utils/wellness');

const NOW = new Date('2026-06-07T08:00:00Z');

describe('wellness constants', () => {
  it('exposes durations, genders, slots', () => {
    expect(DURATIONS).toEqual([30, 60, 90]);
    expect(THERAPIST_GENDERS).toEqual(['male', 'female', 'any']);
    expect(DAY_SLOTS.length).toBeGreaterThan(0);
  });
});

describe('validateWellnessDate', () => {
  it('accepts tomorrow+, rejects today/past/bad', () => {
    expect(validateWellnessDate('2026-06-08', { now: NOW })).toEqual({ ok: true });
    expect(validateWellnessDate('2026-06-07', { now: NOW }).ok).toBe(false);
    expect(validateWellnessDate('07-06-2026', { now: NOW }).ok).toBe(false);
  });
});

describe('isValidDuration', () => {
  it.each([30, 60, 90])('accepts %s', d => expect(isValidDuration(d)).toBe(true));
  it.each([0, 45, 120])('rejects %s', d => expect(isValidDuration(d)).toBe(false));
});

describe('availableSlots', () => {
  it('removes booked, keeps the rest', () => {
    const out = availableSlots(['08:00', '16:00']);
    expect(out).not.toContain('08:00');
    expect(out).toContain('06:30');
  });
  it('all free when none booked', () => {
    expect(availableSlots([])).toEqual(DAY_SLOTS);
  });
});
