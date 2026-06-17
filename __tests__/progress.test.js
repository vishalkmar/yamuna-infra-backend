const { computeProgress, currentMilestone } = require('../src/utils/progress');

describe('server computeProgress', () => {
  it('returns 0 for empty input', () => {
    expect(computeProgress([])).toBe(0);
    expect(computeProgress(undefined)).toBe(0);
  });

  it('returns 100 when everything is completed', () => {
    expect(computeProgress([
      { weight: 50, status: 'completed' },
      { weight: 50, status: 'completed' },
    ])).toBe(100);
  });

  it('computes the seeded Vrindavan Heights scenario near 58', () => {
    const pct = computeProgress([
      { weight: 20, status: 'completed' },
      { weight: 25, status: 'completed' },
      { weight: 25, status: 'in_progress' },
      { weight: 15, status: 'pending' },
      { weight: 15, status: 'pending' },
    ]);
    expect(pct).toBeGreaterThanOrEqual(55);
    expect(pct).toBeLessThanOrEqual(60);
  });
});

describe('server currentMilestone', () => {
  it('prefers in_progress', () => {
    expect(currentMilestone([
      { id: 1, status: 'completed' },
      { id: 2, status: 'in_progress' },
      { id: 3, status: 'pending' },
    ]).id).toBe(2);
  });

  it('falls back to first pending', () => {
    expect(currentMilestone([
      { id: 1, status: 'completed' },
      { id: 3, status: 'pending' },
    ]).id).toBe(3);
  });
});
