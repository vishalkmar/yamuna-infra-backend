const { isIsoDate, isValidTime, validateVisitDate, dayOfWeek } = require('../src/utils/visitDate');

// Fixed reference: 2026-06-10 is a Wednesday (UTC).
// → min bookable = 2026-06-11 (Thu); 2026-06-14 is a Sunday.
const NOW = new Date('2026-06-10T08:00:00Z');

describe('server isIsoDate', () => {
  it('accepts valid ISO date', () => expect(isIsoDate('2026-06-11')).toBe(true));
  it.each(['2026/06/11', '', null, 'x'])('rejects %s', b => expect(isIsoDate(b)).toBe(false));
});

describe('server isValidTime', () => {
  it.each(['10:00', '14:00:00', '09:30'])('accepts %s', t => expect(isValidTime(t)).toBe(true));
  // isValidTime checks HH:MM[:SS] format only, not real-clock ranges.
  it.each(['10', 'noon', '', '1:00', '10:0'])('rejects %s', t => expect(isValidTime(t)).toBe(false));
});

describe('server dayOfWeek', () => {
  it('0 = Sunday, 3 = Wednesday', () => {
    expect(dayOfWeek('2026-06-14')).toBe(0);
    expect(dayOfWeek('2026-06-10')).toBe(3);
  });
});

describe('server validateVisitDate', () => {
  it('accepts valid weekday ≥ tomorrow', () => {
    expect(validateVisitDate('2026-06-11', { now: NOW })).toEqual({ ok: true });
  });
  it('rejects bad format', () => {
    expect(validateVisitDate('11/06/2026', { now: NOW }).ok).toBe(false);
  });
  it('rejects same-day booking', () => {
    expect(validateVisitDate('2026-06-10', { now: NOW }).ok).toBe(false);
  });
  it('rejects Sundays', () => {
    const r = validateVisitDate('2026-06-14', { now: NOW });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/sunday/i);
  });
});
