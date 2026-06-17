// Pure helpers for Home Services (cleaning / cook / housekeeping / attendant).

const SERVICE_TYPES = ['cleaning', 'cook', 'housekeeping', 'attendant'];
const FREQUENCIES = ['one_time', 'daily', 'weekly', 'monthly'];
const GENDER_PREFS = ['male', 'female', 'any'];

const TIME_SLOTS = ['morning', 'afternoon', 'evening'];
const TIME_SLOT_LABEL = {
  morning: 'Morning (8–10 AM)',
  afternoon: 'Afternoon (12–2 PM)',
  evening: 'Evening (5–7 PM)',
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(s) {
  if (!s || !ISO_DATE.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d.getTime());
}

function startOfTodayUTC(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// Service must start at least 1 day from today.
function validateStartDate(isoDate, { now = new Date() } = {}) {
  if (!isIsoDate(isoDate)) return { ok: false, reason: 'Invalid date format (use YYYY-MM-DD)' };
  const min = startOfTodayUTC(now);
  min.setUTCDate(min.getUTCDate() + 1);
  const target = new Date(isoDate + 'T00:00:00Z');
  if (target < min) return { ok: false, reason: 'Service must start at least 1 day from today' };
  return { ok: true };
}

function timeSlotLabel(slot) {
  return TIME_SLOT_LABEL[slot] || slot;
}

const FREQUENCY_LABEL = {
  one_time: 'One-time',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

// Anything other than a one-off is treated as a recurring subscription
// (relevant for housekeeping / domestic staff that come daily/weekly/monthly).
function isRecurring(frequency) {
  return FREQUENCIES.includes(frequency) && frequency !== 'one_time';
}

function frequencyLabel(frequency) {
  return FREQUENCY_LABEL[frequency] || frequency;
}

// ----- Cook booking (Module 12) options -----
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'];
const DIET_TYPES = ['veg', 'jain', 'non_veg'];
const DIET_LABEL = { veg: 'Veg', jain: 'Jain', non_veg: 'Non-veg' };

// Keep only valid, unique meals in canonical order.
function normalizeMeals(list) {
  if (!Array.isArray(list)) return [];
  const set = new Set(list.filter(m => MEAL_TYPES.includes(m)));
  return MEAL_TYPES.filter(m => set.has(m));
}

function dietLabel(diet) {
  return DIET_LABEL[diet] || diet;
}

module.exports = {
  SERVICE_TYPES,
  FREQUENCIES,
  GENDER_PREFS,
  TIME_SLOTS,
  TIME_SLOT_LABEL,
  FREQUENCY_LABEL,
  MEAL_TYPES,
  DIET_TYPES,
  DIET_LABEL,
  isIsoDate,
  validateStartDate,
  timeSlotLabel,
  isRecurring,
  frequencyLabel,
  normalizeMeals,
  dietLabel,
};
