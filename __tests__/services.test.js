const {
  SERVICE_TYPES, FREQUENCIES, GENDER_PREFS, TIME_SLOTS, MEAL_TYPES, DIET_TYPES,
  isIsoDate, validateStartDate, timeSlotLabel, isRecurring, frequencyLabel,
  normalizeMeals, dietLabel,
} = require('../src/utils/services');

// 2026-06-10 reference → min start = 2026-06-11 (today + 1).
const NOW = new Date('2026-06-10T08:00:00Z');

describe('services constants', () => {
  it('exposes blueprint service types / frequencies / time slots / gender prefs', () => {
    expect(SERVICE_TYPES).toEqual(['cleaning', 'cook', 'housekeeping', 'attendant']);
    expect(FREQUENCIES).toEqual(['one_time', 'daily', 'weekly', 'monthly']);
    expect(TIME_SLOTS).toEqual(['morning', 'afternoon', 'evening']);
    expect(GENDER_PREFS).toEqual(['male', 'female', 'any']);
  });
});

describe('isIsoDate', () => {
  it('accepts valid, rejects junk', () => {
    expect(isIsoDate('2026-06-11')).toBe(true);
    expect(isIsoDate('11-06-2026')).toBe(false);
    expect(isIsoDate('')).toBe(false);
  });
});

describe('validateStartDate', () => {
  it('accepts a date at least 1 day out', () => {
    expect(validateStartDate('2026-06-11', { now: NOW })).toEqual({ ok: true });
  });
  it('rejects same-day / past', () => {
    expect(validateStartDate('2026-06-10', { now: NOW }).ok).toBe(false);
  });
  it('rejects bad format', () => {
    expect(validateStartDate('2026/06/11', { now: NOW }).ok).toBe(false);
  });
});

describe('timeSlotLabel', () => {
  it('maps slot keys to friendly labels', () => {
    expect(timeSlotLabel('morning')).toMatch(/8–10/);
    expect(timeSlotLabel('evening')).toMatch(/5–7/);
    expect(timeSlotLabel('weird')).toBe('weird');
  });
});

describe('isRecurring (Module 11 — domestic subscriptions)', () => {
  it('treats daily/weekly/monthly as recurring', () => {
    expect(isRecurring('daily')).toBe(true);
    expect(isRecurring('weekly')).toBe(true);
    expect(isRecurring('monthly')).toBe(true);
  });
  it('one-time and unknown are not recurring', () => {
    expect(isRecurring('one_time')).toBe(false);
    expect(isRecurring('whenever')).toBe(false);
  });
});

describe('frequencyLabel', () => {
  it('maps frequency keys to friendly labels', () => {
    expect(frequencyLabel('one_time')).toBe('One-time');
    expect(frequencyLabel('monthly')).toBe('Monthly');
    expect(frequencyLabel('weird')).toBe('weird');
  });
});

describe('cook options (Module 12)', () => {
  it('exposes meal + diet types', () => {
    expect(MEAL_TYPES).toEqual(['breakfast', 'lunch', 'dinner']);
    expect(DIET_TYPES).toEqual(['veg', 'jain', 'non_veg']);
  });

  it('normalizeMeals de-dupes, drops junk, keeps canonical order', () => {
    expect(normalizeMeals(['dinner', 'breakfast', 'breakfast', 'pizza'])).toEqual(['breakfast', 'dinner']);
    expect(normalizeMeals([])).toEqual([]);
    expect(normalizeMeals('lunch')).toEqual([]);
  });

  it('dietLabel maps keys, passes through unknown', () => {
    expect(dietLabel('non_veg')).toBe('Non-veg');
    expect(dietLabel('jain')).toBe('Jain');
    expect(dietLabel('keto')).toBe('keto');
  });
});
