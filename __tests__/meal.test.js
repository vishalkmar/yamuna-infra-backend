const {
  MEAL_TYPES, DIET_TYPES, SUBSCRIPTION_PLANS, PLAN_DAYS,
  validateMealDate, normalizeMealTypes, nextRenewalDate, dietLabel, mealLabel,
} = require('../src/utils/meal');

// 2026-06-10 reference → min meal date = 2026-06-11 (today + 1).
const NOW = new Date('2026-06-10T08:00:00Z');

describe('meal constants', () => {
  it('exposes blueprint meal/diet types + plans', () => {
    expect(MEAL_TYPES).toEqual(['breakfast', 'lunch', 'dinner', 'prasadam']);
    expect(DIET_TYPES).toEqual(['satvik', 'jain', 'regular_veg', 'custom']);
    expect(SUBSCRIPTION_PLANS).toEqual(['daily', 'weekly', 'monthly']);
    expect(PLAN_DAYS).toEqual({ daily: 1, weekly: 7, monthly: 30 });
  });
});

describe('validateMealDate', () => {
  it('accepts a date at least 1 day out', () => {
    expect(validateMealDate('2026-06-11', { now: NOW })).toEqual({ ok: true });
  });
  it('rejects same-day / past / bad format', () => {
    expect(validateMealDate('2026-06-10', { now: NOW }).ok).toBe(false);
    expect(validateMealDate('11/06/2026', { now: NOW }).ok).toBe(false);
  });
});

describe('normalizeMealTypes', () => {
  it('de-dupes, drops junk, keeps canonical order', () => {
    expect(normalizeMealTypes(['dinner', 'breakfast', 'breakfast', 'brunch', 'prasadam']))
      .toEqual(['breakfast', 'dinner', 'prasadam']);
    expect(normalizeMealTypes('lunch')).toEqual([]);
  });
});

describe('nextRenewalDate', () => {
  it('adds plan days from start date', () => {
    expect(nextRenewalDate('daily', '2026-06-10')).toBe('2026-06-11');
    expect(nextRenewalDate('weekly', '2026-06-10')).toBe('2026-06-17');
    expect(nextRenewalDate('monthly', '2026-06-10')).toBe('2026-07-10');
  });
  it('returns null for unknown plan', () => {
    expect(nextRenewalDate('yearly', '2026-06-10')).toBeNull();
  });
});

describe('labels', () => {
  it('map keys, pass through unknown', () => {
    expect(dietLabel('regular_veg')).toBe('Regular Veg');
    expect(mealLabel('prasadam')).toBe('Prasadam');
    expect(dietLabel('keto')).toBe('keto');
  });
});
