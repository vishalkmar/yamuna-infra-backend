// Pure helpers for Emergency SOS (Module 14) — no DB, easy to unit-test.

const RELATIONS = ['son', 'daughter', 'spouse', 'sibling', 'parent', 'other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

// Auto-triggered response actions when SOS fires.
const SOS_ACTIONS = ['doctor', 'nurse', 'ambulance', 'attendant', 'family_notify'];

const MOBILE_RX = /^[6-9]\d{9}$/;

function isValidMobile(phone) {
  return typeof phone === 'string' && MOBILE_RX.test(phone);
}

function isValidBloodGroup(bg) {
  return BLOOD_GROUPS.includes(bg);
}

function isValidRelation(rel) {
  return RELATIONS.includes(rel);
}

// Validate a single emergency contact. Returns { ok } or { ok:false, reason }.
function validateContact(c) {
  if (!c || typeof c.name !== 'string' || c.name.trim().length < 3) {
    return { ok: false, reason: 'Contact name must be at least 3 characters' };
  }
  if (!isValidMobile(c.phone)) {
    return { ok: false, reason: 'Enter a valid 10-digit mobile (starts 6-9)' };
  }
  if (!isValidRelation(c.relation)) {
    return { ok: false, reason: 'Choose a valid relation' };
  }
  return { ok: true };
}

function makeRequestCode(now = new Date(), rand = Math.random) {
  const y = now.getFullYear();
  const n = Math.floor(rand() * 9e5 + 1e5); // 6-digit
  return `SOS-${y}-${n}`;
}

// Deterministic-ish ambulance ETA in minutes (bounded 5–20).
function etaMinutes(seed = Math.random()) {
  return 5 + Math.floor(seed * 16);
}

module.exports = {
  RELATIONS,
  BLOOD_GROUPS,
  SOS_ACTIONS,
  isValidMobile,
  isValidBloodGroup,
  isValidRelation,
  validateContact,
  makeRequestCode,
  etaMinutes,
};
