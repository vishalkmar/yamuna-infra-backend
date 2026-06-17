const {
  VISIT_PURPOSES, EXTRA_SERVICES, AMENITY_SLOTS,
  validateVisitDate, validateValidTill, validateAmenityDate, availableSlots, normalizeExtras,
  makeQrToken, makeBookingCode,
} = require('../src/utils/community');

const NOW = new Date('2026-06-07T08:00:00Z');

describe('community constants', () => {
  it('exposes purposes / extras / slots', () => {
    expect(VISIT_PURPOSES).toEqual(['personal', 'delivery', 'service', 'medical']);
    expect(EXTRA_SERVICES).toEqual(['sound_system', 'projector', 'catering', 'decoration']);
    expect(AMENITY_SLOTS.length).toBe(5);
  });
});

describe('validateVisitDate', () => {
  it('today or later ok, past rejected', () => {
    expect(validateVisitDate('2026-06-07', { now: NOW })).toEqual({ ok: true });
    expect(validateVisitDate('2026-06-06', { now: NOW }).ok).toBe(false);
  });
});

describe('validateValidTill', () => {
  it('empty is allowed', () => {
    expect(validateValidTill('', '2026-06-07')).toEqual({ ok: true });
  });
  it('within 30 days ok, beyond rejected, before visit rejected', () => {
    expect(validateValidTill('2026-06-20', '2026-06-07').ok).toBe(true);
    expect(validateValidTill('2026-08-01', '2026-06-07').ok).toBe(false);
    expect(validateValidTill('2026-06-01', '2026-06-07').ok).toBe(false);
  });
});

describe('validateAmenityDate', () => {
  it('tomorrow..+30 ok, today rejected, +31 rejected', () => {
    expect(validateAmenityDate('2026-06-08', { now: NOW }).ok).toBe(true);
    expect(validateAmenityDate('2026-07-07', { now: NOW }).ok).toBe(true);
    expect(validateAmenityDate('2026-06-07', { now: NOW }).ok).toBe(false);
    expect(validateAmenityDate('2026-07-08', { now: NOW }).ok).toBe(false);
  });
});

describe('availableSlots / normalizeExtras', () => {
  it('removes booked slots', () => {
    expect(availableSlots(['08:00-10:00'])).not.toContain('08:00-10:00');
  });
  it('normalizeExtras de-dupes + drops junk', () => {
    expect(normalizeExtras(['catering', 'catering', 'pizza', 'projector'])).toEqual(['catering', 'projector']);
    expect(normalizeExtras(null)).toEqual([]);
  });
});

describe('code generators', () => {
  it('QR + booking codes match patterns', () => {
    expect(makeQrToken(NOW, () => 0.5)).toMatch(/^GP-2026-\d{6}$/);
    expect(makeBookingCode(NOW, () => 0.5)).toMatch(/^AMB-2026-\d{5}$/);
  });
});
