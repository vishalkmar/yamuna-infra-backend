const {
  AID_CATEGORIES, BOOK_MODES, ATTENDANT_FEE_PER_DAY, validateStartDate, computeTotal,
} = require('../src/utils/mobility');

const NOW = new Date('2026-06-07T08:00:00Z');
const aid = { rentPerDay: 150, buyPrice: 6500 };

describe('mobility constants', () => {
  it('exposes categories + modes', () => {
    expect(AID_CATEGORIES).toEqual(['wheelchair', 'walker', 'scooter', 'support', 'bed']);
    expect(BOOK_MODES).toEqual(['rent', 'buy']);
    expect(ATTENDANT_FEE_PER_DAY).toBe(300);
  });
});

describe('validateStartDate', () => {
  it('allows today and future, rejects past', () => {
    expect(validateStartDate('2026-06-07', { now: NOW })).toEqual({ ok: true });
    expect(validateStartDate('2026-06-06', { now: NOW }).ok).toBe(false);
    expect(validateStartDate('bad', { now: NOW }).ok).toBe(false);
  });
});

describe('computeTotal', () => {
  it('buy → buy price', () => {
    expect(computeTotal(aid, { mode: 'buy' })).toBe(6500);
  });
  it('rent → rentPerDay × days', () => {
    expect(computeTotal(aid, { mode: 'rent', days: 5 })).toBe(750);
  });
  it('rent + attendant', () => {
    expect(computeTotal(aid, { mode: 'rent', days: 2, withAttendant: true })).toBe(150 * 2 + 300 * 2);
  });
  it('null aid → 0', () => {
    expect(computeTotal(null, { mode: 'buy' })).toBe(0);
  });
});
