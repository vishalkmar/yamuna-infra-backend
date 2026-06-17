// Pure helpers — no DB, no time. Easy to unit-test.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RX = /^\d{2}:\d{2}(:\d{2})?$/;

function isIsoDate(s) {
  if (!s || !ISO_DATE.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d.getTime());
}

function startOfTodayUTC(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function dayOfWeek(isoDate) {
  // 0 = Sunday … 6 = Saturday (UTC)
  return new Date(isoDate + 'T00:00:00Z').getUTCDay();
}

/**
 * Returns { ok: true } if the date is bookable (today+1 and not Sunday),
 * or { ok: false, reason } describing the failure.
 * Does NOT check blackout dates — that's a DB call done in the controller.
 */
function validateVisitDate(isoDate, { now = new Date() } = {}) {
  if (!isIsoDate(isoDate)) return { ok: false, reason: 'Invalid date format (use YYYY-MM-DD)' };
  const minDate = startOfTodayUTC(now);
  minDate.setUTCDate(minDate.getUTCDate() + 1);
  const target = new Date(isoDate + 'T00:00:00Z');
  if (target < minDate) return { ok: false, reason: 'Site visits must be booked at least 1 day in advance' };
  if (dayOfWeek(isoDate) === 0) return { ok: false, reason: 'Sundays are closed for site visits' };
  return { ok: true };
}

function isValidTime(s) {
  return TIME_RX.test(s);
}

module.exports = { isIsoDate, isValidTime, validateVisitDate, dayOfWeek };
