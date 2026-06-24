// Shared lead helpers (AMS Phase 2).

const STAGES = ['new', 'contacted', 'site_visit', 'negotiation', 'booked', 'lost'];

// Normalized phone for de-duplication / ownership (Module 2.6): digits only,
// last 10 (drops +91 / 0 prefixes). Returns null if too short.
function dedupeKey(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 10) return digits || null;
  return digits.slice(-10);
}

module.exports = { STAGES, dedupeKey };
