// Pure helpers for Community / Visitor / Amenity (Modules 21–23).

const VISIT_PURPOSES = ['personal', 'delivery', 'service', 'medical'];
const EXTRA_SERVICES = ['sound_system', 'projector', 'catering', 'decoration'];
const AMENITY_SLOTS = ['06:00-08:00', '08:00-10:00', '10:00-12:00', '16:00-18:00', '18:00-20:00'];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(s) {
  if (!s || !ISO_DATE.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d.getTime());
}

function startOfTodayUTC(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function daysBetween(aIso, bIso) {
  const a = new Date(aIso + 'T00:00:00Z');
  const b = new Date(bIso + 'T00:00:00Z');
  return Math.round((b - a) / 86400000);
}

// Visitor pass: visit date today or later.
function validateVisitDate(isoDate, { now = new Date() } = {}) {
  if (!isIsoDate(isoDate)) return { ok: false, reason: 'Invalid date format (use YYYY-MM-DD)' };
  if (new Date(isoDate + 'T00:00:00Z') < startOfTodayUTC(now)) {
    return { ok: false, reason: 'Visit date cannot be in the past' };
  }
  return { ok: true };
}

// validTill must be within 30 days of visitDate (and not before it).
function validateValidTill(validTill, visitDate) {
  if (validTill == null || validTill === '') return { ok: true };
  if (!isIsoDate(validTill)) return { ok: false, reason: 'Invalid valid-till date' };
  const diff = daysBetween(visitDate, validTill);
  if (diff < 0) return { ok: false, reason: 'Valid-till cannot be before the visit date' };
  if (diff > 30) return { ok: false, reason: 'Valid-till cannot be more than 30 days from visit date' };
  return { ok: true };
}

// Amenity booking: today+1 .. today+30.
function validateAmenityDate(isoDate, { now = new Date() } = {}) {
  if (!isIsoDate(isoDate)) return { ok: false, reason: 'Invalid date format (use YYYY-MM-DD)' };
  const min = startOfTodayUTC(now); min.setUTCDate(min.getUTCDate() + 1);
  const max = startOfTodayUTC(now); max.setUTCDate(max.getUTCDate() + 30);
  const target = new Date(isoDate + 'T00:00:00Z');
  if (target < min) return { ok: false, reason: 'Bookings open from tomorrow' };
  if (target > max) return { ok: false, reason: 'Bookings allowed up to 30 days ahead' };
  return { ok: true };
}

function availableSlots(bookedSlots = []) {
  const taken = new Set(bookedSlots);
  return AMENITY_SLOTS.filter(s => !taken.has(s));
}

function normalizeExtras(list) {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.filter(x => EXTRA_SERVICES.includes(x)))];
}

function makeQrToken(now = new Date(), rand = Math.random) {
  return `GP-${now.getFullYear()}-${Math.floor(rand() * 9e5 + 1e5)}`;
}

function makeBookingCode(now = new Date(), rand = Math.random) {
  return `AMB-${now.getFullYear()}-${Math.floor(rand() * 9e4 + 1e4)}`;
}

module.exports = {
  VISIT_PURPOSES,
  EXTRA_SERVICES,
  AMENITY_SLOTS,
  isIsoDate,
  validateVisitDate,
  validateValidTill,
  validateAmenityDate,
  availableSlots,
  normalizeExtras,
  makeQrToken,
  makeBookingCode,
};
