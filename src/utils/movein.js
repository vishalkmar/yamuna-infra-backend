// Pure helpers for Move-In Assistance — no DB, easy to unit-test.

const ITEM_CATEGORIES = ['furniture', 'electronics', 'fragile', 'vehicle'];
const UTILITY_TYPES = ['electricity', 'water', 'piped_gas', 'internet'];
const MIN_MOVE_DAYS = 3;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Simulated peak/blackout dates where packers are fully booked.
const VENDOR_BLACKOUTS = ['2026-11-08', '2026-12-25', '2027-01-01'];

const UTILITY_PROVIDER = {
  electricity: 'UPPCL — Dakshinanchal',
  water: 'Vrindavan Jal Nigam',
  piped_gas: 'Green Gas Ltd',
  internet: 'Yamuna Fibernet',
};

function isIsoDate(s) {
  if (!s || !ISO_DATE.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d.getTime());
}

function startOfTodayUTC(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// Shifting must be booked at least MIN_MOVE_DAYS ahead.
function validateMoveDate(isoDate, { now = new Date() } = {}) {
  if (!isIsoDate(isoDate)) return { ok: false, reason: 'Invalid date format (use YYYY-MM-DD)' };
  const min = startOfTodayUTC(now);
  min.setUTCDate(min.getUTCDate() + MIN_MOVE_DAYS);
  const target = new Date(isoDate + 'T00:00:00Z');
  if (target < min) return { ok: false, reason: `Moving date must be at least ${MIN_MOVE_DAYS} days away` };
  return { ok: true };
}

function isVendorAvailable(isoDate) {
  return !VENDOR_BLACKOUTS.includes(isoDate);
}

// Utility activation ETA — N days after the reference date.
function expectedActivationDate(fromIso, days = 7) {
  const base = isIsoDate(fromIso) ? new Date(fromIso + 'T00:00:00Z') : startOfTodayUTC();
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function normalizeItemCategories(list) {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.filter(c => ITEM_CATEGORIES.includes(c)))];
}

function providerForUtility(type) {
  return UTILITY_PROVIDER[type] || null;
}

module.exports = {
  ITEM_CATEGORIES,
  UTILITY_TYPES,
  MIN_MOVE_DAYS,
  VENDOR_BLACKOUTS,
  isIsoDate,
  validateMoveDate,
  isVendorAvailable,
  expectedActivationDate,
  normalizeItemCategories,
  providerForUtility,
};
