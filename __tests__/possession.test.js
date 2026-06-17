const {
  POSSESSION_SLOTS, computeChecklistPct, allDone, derivePossessionStatus, isValidSlot, statusLabel,
} = require('../src/utils/possession');

describe('computeChecklistPct', () => {
  it('returns 0 for empty / non-array', () => {
    expect(computeChecklistPct([])).toBe(0);
    expect(computeChecklistPct(undefined)).toBe(0);
  });
  it('rounds the completed ratio', () => {
    expect(computeChecklistPct([{ completed: 1 }, { completed: 0 }, { completed: 1 }])).toBe(67);
    expect(computeChecklistPct([{ completed: true }, { completed: true }])).toBe(100);
  });
});

describe('allDone', () => {
  it('true only when every item is complete', () => {
    expect(allDone([{ completed: 1 }, { completed: true }])).toBe(true);
    expect(allDone([{ completed: 1 }, { completed: 0 }])).toBe(false);
    expect(allDone([])).toBe(false);
  });
});

describe('derivePossessionStatus', () => {
  const incomplete = [{ completed: 1 }, { completed: 0 }];
  const complete = [{ completed: 1 }, { completed: 1 }];

  it('possessed wins over everything', () => {
    expect(derivePossessionStatus({ checklist: complete, bookingStatus: 'possessed', hasUpcomingAppointment: true })).toBe('possessed');
  });
  it('scheduled when an appointment exists', () => {
    expect(derivePossessionStatus({ checklist: incomplete, hasUpcomingAppointment: true })).toBe('scheduled');
  });
  it('ready when checklist complete or booking flagged ready', () => {
    expect(derivePossessionStatus({ checklist: complete, hasUpcomingAppointment: false })).toBe('ready');
    expect(derivePossessionStatus({ checklist: incomplete, bookingStatus: 'possession_ready', hasUpcomingAppointment: false })).toBe('ready');
  });
  it('pending_clearance otherwise', () => {
    expect(derivePossessionStatus({ checklist: incomplete, bookingStatus: 'active', hasUpcomingAppointment: false })).toBe('pending_clearance');
  });
});

describe('isValidSlot / statusLabel', () => {
  it('validates the two blueprint slots', () => {
    expect(POSSESSION_SLOTS).toHaveLength(2);
    expect(isValidSlot('09:00 AM – 12:00 PM')).toBe(true);
    expect(isValidSlot('midnight')).toBe(false);
  });
  it('maps status to a human label', () => {
    expect(statusLabel('ready')).toBe('Possession Ready');
    expect(statusLabel('pending_clearance')).toBe('Pending Clearance');
    expect(statusLabel('weird')).toBe('weird');
  });
});
