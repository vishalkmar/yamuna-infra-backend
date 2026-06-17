// Pure helpers for Darshan & Transport booking (Modules 18–20).

const TRANSPORT_TYPES = ['shared_shuttle', 'private_taxi', 'e_rickshaw', 'walking_group'];
const VISIT_SLOTS = ['morning', 'afternoon', 'evening'];
const SPECIAL_PUJAS = ['abhishek', 'bhog', 'seva'];
const CROWD_LEVELS = ['low', 'moderate', 'high', 'very_high'];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(s) {
  if (!s || !ISO_DATE.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d.getTime());
}

function startOfTodayUTC(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// Darshan can be booked same-day; only past dates are rejected.
function validateDarshanDate(isoDate, { now = new Date() } = {}) {
  if (!isIsoDate(isoDate)) return { ok: false, reason: 'Invalid date format (use YYYY-MM-DD)' };
  const target = new Date(isoDate + 'T00:00:00Z');
  if (target < startOfTodayUTC(now)) return { ok: false, reason: 'Darshan date cannot be in the past' };
  return { ok: true };
}

// Senior count cannot exceed total pilgrims.
function validateSeniors(seniors, persons) {
  const s = Number(seniors) || 0;
  const p = Number(persons) || 0;
  if (s < 0) return { ok: false, reason: 'Senior count cannot be negative' };
  if (s > p) return { ok: false, reason: 'Senior citizens cannot exceed total pilgrims' };
  return { ok: true };
}

function makeDarshanCode(now = new Date(), rand = Math.random) {
  return `DSN-${now.getFullYear()}-${Math.floor(rand() * 9e4 + 1e4)}`;
}

module.exports = {
  TRANSPORT_TYPES,
  VISIT_SLOTS,
  SPECIAL_PUJAS,
  CROWD_LEVELS,
  isIsoDate,
  validateDarshanDate,
  validateSeniors,
  makeDarshanCode,
};
