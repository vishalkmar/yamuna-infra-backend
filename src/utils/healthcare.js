// Pure helpers for Doctor & Healthcare Booking (Module 15).

const CONSULTATION_TYPES = ['video', 'home', 'clinic'];
const SPECIALTIES = [
  'General Physician', 'Cardiologist', 'Orthopedic', 'Diabetologist', 'Pediatrician', 'Physiotherapist',
];

// Fixed daily slots; availability = these minus already-booked for a doctor+date.
const DAY_SLOTS = ['10:00', '11:00', '12:00', '17:00', '18:00', '19:00'];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(s) {
  if (!s || !ISO_DATE.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d.getTime());
}

function startOfTodayUTC(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// Appointment date must be today or later.
function validateApptDate(isoDate, { now = new Date() } = {}) {
  if (!isIsoDate(isoDate)) return { ok: false, reason: 'Invalid date format (use YYYY-MM-DD)' };
  const target = new Date(isoDate + 'T00:00:00Z');
  if (target < startOfTodayUTC(now)) return { ok: false, reason: 'Appointment date cannot be in the past' };
  return { ok: true };
}

function isValidAge(age) {
  const n = Number(age);
  return Number.isInteger(n) && n >= 1 && n <= 120;
}

// Available slots = DAY_SLOTS minus the booked ones.
function availableSlots(bookedSlots = []) {
  const taken = new Set(bookedSlots.map(s => String(s).slice(0, 5)));
  return DAY_SLOTS.filter(s => !taken.has(s));
}

function makeAppointmentCode(now = new Date(), rand = Math.random) {
  return `APT-${now.getFullYear()}-${Math.floor(rand() * 9e4 + 1e4)}`;
}

module.exports = {
  CONSULTATION_TYPES,
  SPECIALTIES,
  DAY_SLOTS,
  isIsoDate,
  validateApptDate,
  isValidAge,
  availableSlots,
  makeAppointmentCode,
};
