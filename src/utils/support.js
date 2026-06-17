// Pure helpers for the support desk — no DB, easy to unit-test.

const CATEGORIES = ['payment', 'construction', 'document', 'general'];
const PRIORITIES = ['normal', 'urgent'];
const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

const TICKET_CODE_RX = /^SR-\d{4}-\d{5}$/;

// Default CRM executive per category — deterministic so tests can assert it.
const AGENT_BY_CATEGORY = {
  payment: 'Kunal Naskar',
  construction: 'Rohit Verma',
  document: 'Sneha Iyer',
  general: 'Support Desk',
};

function makeTicketCode(now = new Date(), rand = Math.random) {
  const year = now.getFullYear();
  const n = Math.floor(rand() * 9e4 + 1e4); // 5-digit
  return `SR-${year}-${n}`;
}

function isValidTicketCode(code) {
  return typeof code === 'string' && TICKET_CODE_RX.test(code);
}

function agentForCategory(category) {
  return AGENT_BY_CATEGORY[category] || AGENT_BY_CATEGORY.general;
}

// Keep at most 3 well-formed attachments; drop anything without a url.
function clampAttachments(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter(a => a && typeof a.url === 'string' && a.url.length > 0)
    .slice(0, 3)
    .map(a => ({
      url: a.url,
      kind: a.kind === 'document' ? 'document' : 'image',
      fileSize: a.fileSize || null,
    }));
}

module.exports = {
  CATEGORIES,
  PRIORITIES,
  STATUSES,
  makeTicketCode,
  isValidTicketCode,
  agentForCategory,
  clampAttachments,
};
