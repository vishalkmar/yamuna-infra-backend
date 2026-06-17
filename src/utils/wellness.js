// Pure helpers for Ayurvedic Wellness & Spa (Module 17).

const DURATIONS = [30, 60, 90];
const THERAPIST_GENDERS = ['male', 'female', 'any'];
const DAY_SLOTS = ['06:30', '08:00', '10:00', '12:00', '16:00', '18:00'];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(s) {
  if (!s || !ISO_DATE.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d.getTime());
}

function startOfTodayUTC(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// Wellness sessions must be booked at least 1 day ahead.
function validateWellnessDate(isoDate, { now = new Date() } = {}) {
  if (!isIsoDate(isoDate)) return { ok: false, reason: 'Invalid date format (use YYYY-MM-DD)' };
  const min = startOfTodayUTC(now);
  min.setUTCDate(min.getUTCDate() + 1);
  const target = new Date(isoDate + 'T00:00:00Z');
  if (target < min) return { ok: false, reason: 'Sessions must be booked at least 1 day in advance' };
  return { ok: true };
}

function isValidDuration(d) {
  return DURATIONS.includes(Number(d));
}

function availableSlots(bookedSlots = []) {
  const taken = new Set(bookedSlots.map(s => String(s).slice(0, 5)));
  return DAY_SLOTS.filter(s => !taken.has(s));
}

module.exports = {
  DURATIONS,
  THERAPIST_GENDERS,
  DAY_SLOTS,
  isIsoDate,
  validateWellnessDate,
  isValidDuration,
  availableSlots,
};
