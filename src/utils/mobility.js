// Pure helpers for Wheelchair & Mobility Assistance (Module 16).

const AID_CATEGORIES = ['wheelchair', 'walker', 'scooter', 'support', 'bed'];
const BOOK_MODES = ['rent', 'buy'];
const ATTENDANT_FEE_PER_DAY = 300;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(s) {
  if (!s || !ISO_DATE.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d.getTime());
}

function startOfTodayUTC(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// Same-day allowed (mobility needs are often urgent); only past dates rejected.
function validateStartDate(isoDate, { now = new Date() } = {}) {
  if (!isIsoDate(isoDate)) return { ok: false, reason: 'Invalid date format (use YYYY-MM-DD)' };
  const target = new Date(isoDate + 'T00:00:00Z');
  if (target < startOfTodayUTC(now)) return { ok: false, reason: 'Start date cannot be in the past' };
  return { ok: true };
}

/**
 * Total cost for a mobility booking.
 *   buy  → the aid's buy price (days/attendant ignored)
 *   rent → rentPerDay × days + (attendant ? ATTENDANT_FEE_PER_DAY × days : 0)
 */
function computeTotal(aid, { mode = 'rent', days = 1, withAttendant = false } = {}) {
  if (!aid) return 0;
  if (mode === 'buy') return Number(aid.buyPrice) || 0;
  const d = Math.max(1, Number(days) || 1);
  const rent = (Number(aid.rentPerDay) || 0) * d;
  const attendant = withAttendant ? ATTENDANT_FEE_PER_DAY * d : 0;
  return rent + attendant;
}

module.exports = {
  AID_CATEGORIES,
  BOOK_MODES,
  ATTENDANT_FEE_PER_DAY,
  isIsoDate,
  validateStartDate,
  computeTotal,
};
