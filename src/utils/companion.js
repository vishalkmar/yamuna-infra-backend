// Pure helpers for the AI Concierge / My Vrindavan Companion (Module 26).

const ACTIVITIES = ['walk', 'yoga', 'medication', 'temple', 'meals'];
const TIME_RX = /^\d{2}:\d{2}$/;

const DAILY_QUOTES = [
  'योगः कर्मसु कौशलम् — Yoga is skill in action.',
  'Wherever there is Krishna, there is victory and prosperity.',
  'The mind is restless, but it can be stilled by practice and detachment.',
  'Serve, love, give, purify — the rest will follow.',
  'A calm mind brings inner strength and self-confidence.',
];
const DAILY_BHAJANS = [
  'Achyutam Keshavam — Krishna Damodaram',
  'Hare Krishna Maha-mantra',
  'Govind Bolo Hari Gopal Bolo',
  'Radhe Radhe Govinda',
  'Yashomati Nandan',
];
const TEMPLE_SUGGESTIONS = [
  'Banke Bihari Temple', 'Prem Mandir', 'ISKCON Vrindavan', 'Radha Raman Temple', 'Nidhivan',
];

function isValidMood(m) {
  const n = Number(m);
  return Number.isInteger(n) && n >= 1 && n <= 5;
}

function isValidPain(p) {
  if (p == null || p === '') return true;
  const n = Number(p);
  return Number.isInteger(n) && n >= 0 && n <= 10;
}

function normalizeActivities(list) {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.filter(a => ACTIVITIES.includes(a)))];
}

function validateCheckin(c) {
  if (!isValidMood(c.moodScore)) return { ok: false, reason: 'Mood must be between 1 and 5' };
  if (!isValidPain(c.painLevel)) return { ok: false, reason: 'Pain level must be between 0 and 10' };
  return { ok: true };
}

// Deterministic daily content (no external dependency).
function dailyContent(isoDate = new Date().toISOString().slice(0, 10)) {
  let seed = 0;
  for (const ch of isoDate) seed += ch.charCodeAt(0);
  return {
    date: isoDate,
    quote: DAILY_QUOTES[seed % DAILY_QUOTES.length],
    bhajan: DAILY_BHAJANS[seed % DAILY_BHAJANS.length],
    templeSuggestion: TEMPLE_SUGGESTIONS[seed % TEMPLE_SUGGESTIONS.length],
  };
}

// Rule-based assistant reply — keyword routing into helpful, on-brand answers.
function aiReply(message = '') {
  const m = String(message).toLowerCase();
  if (/aarti|darshan|temple|mandir/.test(m)) {
    return 'Banke Bihari morning shringar aarti is at 9:00 AM. Would you like me to book a shuttle to the temple?';
  }
  if (/payment|installment|due|emi/.test(m)) {
    return 'Your next installment is shown on the Payments screen. I can open the Pay Now sheet for you.';
  }
  if (/doctor|health|medicine|appointment/.test(m)) {
    return 'I can book a doctor consultation or set a medicine reminder. Which would you prefer?';
  }
  if (/clean|cook|maid|housekeep/.test(m)) {
    return 'You can book cleaning, a cook or housekeeping from Resident Services. Want me to take you there?';
  }
  if (/sos|emergency|help|ambulance/.test(m)) {
    return 'For emergencies, press and hold the red SOS button for 3 seconds. Are you safe right now?';
  }
  if (/hello|hi|namaste|radhe/.test(m)) {
    return 'Radhe Radhe! 🙏 How can I help you today — temple visit, payments, or home services?';
  }
  return "I'm your Vrindavan Companion. I can help with darshan, payments, home services, healthcare and reminders. What do you need?";
}

module.exports = {
  ACTIVITIES,
  DAILY_QUOTES,
  DAILY_BHAJANS,
  TIME_RX,
  isValidMood,
  isValidPain,
  normalizeActivities,
  validateCheckin,
  dailyContent,
  aiReply,
};
