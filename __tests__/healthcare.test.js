const {
  CONSULTATION_TYPES, SPECIALTIES, DAY_SLOTS,
  validateApptDate, isValidAge, availableSlots, makeAppointmentCode,
} = require('../src/utils/healthcare');

const NOW = new Date('2026-06-07T08:00:00Z');

describe('healthcare constants', () => {
  it('exposes consultation types + specialties + slots', () => {
    expect(CONSULTATION_TYPES).toEqual(['video', 'home', 'clinic']);
    expect(SPECIALTIES).toEqual(expect.arrayContaining(['Cardiologist', 'Pediatrician']));
    expect(DAY_SLOTS.length).toBeGreaterThan(0);
  });
});

describe('validateApptDate', () => {
  it('accepts today and future', () => {
    expect(validateApptDate('2026-06-07', { now: NOW })).toEqual({ ok: true });
    expect(validateApptDate('2026-06-20', { now: NOW })).toEqual({ ok: true });
  });
  it('rejects past dates and bad format', () => {
    expect(validateApptDate('2026-06-06', { now: NOW }).ok).toBe(false);
    expect(validateApptDate('07/06/2026', { now: NOW }).ok).toBe(false);
  });
});

describe('isValidAge', () => {
  it.each([1, 45, 120])('accepts %s', a => expect(isValidAge(a)).toBe(true));
  it.each([0, 121, -5, 'x', 2.5])('rejects %s', a => expect(isValidAge(a)).toBe(false));
});

describe('availableSlots', () => {
  it('removes booked slots (normalising HH:MM)', () => {
    const out = availableSlots(['11:00', '17:00:00']);
    expect(out).not.toContain('11:00');
    expect(out).not.toContain('17:00');
    expect(out).toContain('10:00');
  });
  it('returns all when nothing booked', () => {
    expect(availableSlots([])).toEqual(DAY_SLOTS);
  });
});

describe('makeAppointmentCode', () => {
  it('matches APT-YYYY-NNNNN', () => {
    expect(makeAppointmentCode(NOW, () => 0.5)).toMatch(/^APT-2026-\d{5}$/);
  });
});
