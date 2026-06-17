// Pure helpers for Meal Ordering (Module 13) — no DB, easy to unit-test.

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'prasadam'];
const DIET_TYPES = ['satvik', 'jain', 'regular_veg', 'custom'];
const SUBSCRIPTION_PLANS = ['daily', 'weekly', 'monthly'];

const DIET_LABEL = { satvik: 'Satvik', jain: 'Jain', regular_veg: 'Regular Veg', custom: 'Custom' };
const MEAL_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', prasadam: 'Prasadam' };
const PLAN_DAYS = { daily: 1, weekly: 7, monthly: 30 };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(s) {
  if (!s || !ISO_DATE.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d.getTime());
}

function startOfTodayUTC(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// Meal delivery must be booked at least 1 day ahead.
function validateMealDate(isoDate, { now = new Date() } = {}) {
  if (!isIsoDate(isoDate)) return { ok: false, reason: 'Invalid date format (use YYYY-MM-DD)' };
  const min = startOfTodayUTC(now);
  min.setUTCDate(min.getUTCDate() + 1);
  const target = new Date(isoDate + 'T00:00:00Z');
  if (target < min) return { ok: false, reason: 'Meals must be ordered at least 1 day in advance' };
  return { ok: true };
}

// Keep only valid meal types, unique, in canonical order.
function normalizeMealTypes(list) {
  if (!Array.isArray(list)) return [];
  const set = new Set(list.filter(m => MEAL_TYPES.includes(m)));
  return MEAL_TYPES.filter(m => set.has(m));
}

// Renewal date for a subscription plan, counted from the start date.
function nextRenewalDate(plan, fromIso, { now = new Date() } = {}) {
  const days = PLAN_DAYS[plan];
  if (!days) return null;
  const base = isIsoDate(fromIso) ? new Date(fromIso + 'T00:00:00Z') : startOfTodayUTC(now);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function dietLabel(diet) { return DIET_LABEL[diet] || diet; }
function mealLabel(meal) { return MEAL_LABEL[meal] || meal; }

module.exports = {
  MEAL_TYPES,
  DIET_TYPES,
  SUBSCRIPTION_PLANS,
  DIET_LABEL,
  MEAL_LABEL,
  PLAN_DAYS,
  isIsoDate,
  validateMealDate,
  normalizeMealTypes,
  nextRenewalDate,
  dietLabel,
  mealLabel,
};
