const {
  ACTIVITIES, isValidMood, isValidPain, normalizeActivities, validateCheckin, dailyContent, aiReply,
} = require('../src/utils/companion');

describe('companion constants', () => {
  it('exposes activities', () => {
    expect(ACTIVITIES).toEqual(['walk', 'yoga', 'medication', 'temple', 'meals']);
  });
});

describe('isValidMood / isValidPain', () => {
  it.each([1, 3, 5])('mood %s valid', m => expect(isValidMood(m)).toBe(true));
  it.each([0, 6, 2.5])('mood %s invalid', m => expect(isValidMood(m)).toBe(false));
  it('pain 0..10 valid, empty allowed', () => {
    expect(isValidPain(0)).toBe(true);
    expect(isValidPain(10)).toBe(true);
    expect(isValidPain('')).toBe(true);
    expect(isValidPain(11)).toBe(false);
  });
});

describe('normalizeActivities + validateCheckin', () => {
  it('keeps valid unique activities', () => {
    expect(normalizeActivities(['walk', 'walk', 'pizza', 'yoga'])).toEqual(['walk', 'yoga']);
  });
  it('validateCheckin enforces mood + pain', () => {
    expect(validateCheckin({ moodScore: 4, painLevel: 2 })).toEqual({ ok: true });
    expect(validateCheckin({ moodScore: 9 }).ok).toBe(false);
    expect(validateCheckin({ moodScore: 3, painLevel: 99 }).ok).toBe(false);
  });
});

describe('dailyContent', () => {
  it('returns deterministic content for a date', () => {
    const a = dailyContent('2026-06-09');
    const b = dailyContent('2026-06-09');
    expect(a).toEqual(b);
    expect(a.quote).toBeTruthy();
    expect(a.bhajan).toBeTruthy();
  });
});

describe('aiReply', () => {
  it('routes keywords to helpful replies', () => {
    expect(aiReply('when is the aarti?')).toMatch(/aarti/i);
    expect(aiReply('my payment is due')).toMatch(/installment|payment/i);
    expect(aiReply('I need a doctor')).toMatch(/doctor|medicine/i);
    expect(aiReply('radhe radhe')).toMatch(/help/i);
  });
  it('has a sensible fallback', () => {
    expect(aiReply('xyz random')).toMatch(/Companion/);
  });
});
