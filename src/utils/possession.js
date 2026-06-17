// Pure helpers for the possession dashboard — no DB, easy to unit-test.

const POSSESSION_SLOTS = ['09:00 AM – 12:00 PM', '02:00 PM – 05:00 PM'];

const STATUS_LABEL = {
  pending_clearance: 'Pending Clearance',
  ready: 'Possession Ready',
  scheduled: 'Scheduled',
  possessed: 'Possession Complete',
};

function computeChecklistPct(checklist) {
  if (!Array.isArray(checklist) || checklist.length === 0) return 0;
  const done = checklist.filter(c => c.completed === 1 || c.completed === true).length;
  return Math.round((done / checklist.length) * 100);
}

function allDone(checklist) {
  return Array.isArray(checklist) && checklist.length > 0 &&
    checklist.every(c => c.completed === 1 || c.completed === true);
}

/**
 * Derives the banner status shown on the dashboard.
 *   possessed         → handover already done
 *   scheduled         → an upcoming appointment exists
 *   ready             → checklist complete (or booking flagged possession_ready)
 *   pending_clearance → still working through the checklist
 */
function derivePossessionStatus({ checklist, bookingStatus, hasUpcomingAppointment } = {}) {
  if (bookingStatus === 'possessed') return 'possessed';
  if (hasUpcomingAppointment) return 'scheduled';
  if (allDone(checklist) || bookingStatus === 'possession_ready') return 'ready';
  return 'pending_clearance';
}

function isValidSlot(slot) {
  return POSSESSION_SLOTS.includes(slot);
}

function statusLabel(status) {
  return STATUS_LABEL[status] || status;
}

module.exports = {
  POSSESSION_SLOTS,
  STATUS_LABEL,
  computeChecklistPct,
  allDone,
  derivePossessionStatus,
  isValidSlot,
  statusLabel,
};
