const {
  ITEM_CATEGORIES, UTILITY_TYPES, MIN_MOVE_DAYS, VENDOR_BLACKOUTS,
  validateMoveDate, isVendorAvailable, expectedActivationDate,
  normalizeItemCategories, providerForUtility,
} = require('../src/utils/movein');

// 2026-06-10 reference → min move date = 2026-06-13 (today + 3).
const NOW = new Date('2026-06-10T08:00:00Z');

describe('movein constants', () => {
  it('exposes blueprint item categories + utility types', () => {
    expect(ITEM_CATEGORIES).toEqual(['furniture', 'electronics', 'fragile', 'vehicle']);
    expect(UTILITY_TYPES).toEqual(['electricity', 'water', 'piped_gas', 'internet']);
    expect(MIN_MOVE_DAYS).toBe(3);
  });
});

describe('validateMoveDate', () => {
  it('accepts a date at least 3 days out', () => {
    expect(validateMoveDate('2026-06-13', { now: NOW })).toEqual({ ok: true });
  });
  it('rejects dates fewer than 3 days away', () => {
    expect(validateMoveDate('2026-06-12', { now: NOW }).ok).toBe(false);
    expect(validateMoveDate('2026-06-10', { now: NOW }).ok).toBe(false);
  });
  it('rejects bad format', () => {
    expect(validateMoveDate('13/06/2026', { now: NOW }).ok).toBe(false);
  });
});

describe('isVendorAvailable', () => {
  it('false on blackout dates, true otherwise', () => {
    expect(VENDOR_BLACKOUTS.length).toBeGreaterThan(0);
    expect(isVendorAvailable(VENDOR_BLACKOUTS[0])).toBe(false);
    expect(isVendorAvailable('2026-06-20')).toBe(true);
  });
});

describe('expectedActivationDate', () => {
  it('adds 7 days by default', () => {
    expect(expectedActivationDate('2026-06-10')).toBe('2026-06-17');
  });
  it('honours a custom day count', () => {
    expect(expectedActivationDate('2026-06-10', 3)).toBe('2026-06-13');
  });
});

describe('normalizeItemCategories', () => {
  it('keeps only valid, unique categories', () => {
    expect(normalizeItemCategories(['furniture', 'furniture', 'alien', 'vehicle']))
      .toEqual(['furniture', 'vehicle']);
  });
  it('returns [] for non-arrays', () => {
    expect(normalizeItemCategories(null)).toEqual([]);
  });
});

describe('providerForUtility', () => {
  it('maps each utility to a provider, null for unknown', () => {
    expect(providerForUtility('water')).toBe('Vrindavan Jal Nigam');
    expect(providerForUtility('internet')).toBe('Yamuna Fibernet');
    expect(providerForUtility('teleport')).toBeNull();
  });
});
