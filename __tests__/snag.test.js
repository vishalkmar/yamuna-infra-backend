const {
  LOCATIONS, DEFECT_TYPES, SEVERITIES, STATUSES,
  makeSnagCode, isValidSnagCode, canSignOff, severityRank,
} = require('../src/utils/snag');

describe('snag constants', () => {
  it('exposes blueprint defect types / severities / statuses', () => {
    expect(DEFECT_TYPES).toEqual(expect.arrayContaining(['plumbing', 'electrical', 'flooring', 'paint', 'fixture']));
    expect(SEVERITIES).toEqual(['minor', 'major', 'critical']);
    expect(STATUSES).toEqual(['open', 'in_progress', 'resolved', 'signed_off']);
    expect(LOCATIONS).toEqual(expect.arrayContaining(['Kitchen', 'Hall', 'Bathroom 1']));
  });
});

describe('makeSnagCode / isValidSnagCode', () => {
  it('zero-pads to 4 digits', () => {
    expect(makeSnagCode(7)).toBe('SN-0007');
    expect(makeSnagCode(1234)).toBe('SN-1234');
    expect(makeSnagCode(12345)).toBe('SN-12345');
  });
  it('validates the code format', () => {
    expect(isValidSnagCode('SN-0007')).toBe(true);
    expect(isValidSnagCode(makeSnagCode(42))).toBe(true);
  });
  it.each(['SN-1', 'sn-0007', 'XX-0007', '', null, 7])('rejects %s', bad => {
    expect(isValidSnagCode(bad)).toBe(false);
  });
});

describe('canSignOff', () => {
  it('only resolved snags can be signed off', () => {
    expect(canSignOff('resolved')).toBe(true);
    expect(canSignOff('open')).toBe(false);
    expect(canSignOff('in_progress')).toBe(false);
    expect(canSignOff('signed_off')).toBe(false);
  });
});

describe('severityRank', () => {
  it('orders critical < major < minor (most urgent first)', () => {
    expect(severityRank('critical')).toBeLessThan(severityRank('major'));
    expect(severityRank('major')).toBeLessThan(severityRank('minor'));
  });
  it('unknown severities sort last', () => {
    expect(severityRank('weird')).toBe(99);
  });
});
