// Pure helpers for snag / home-inspection — no DB, easy to unit-test.

const LOCATIONS = [
  'Bedroom 1', 'Bedroom 2', 'Hall', 'Kitchen', 'Bathroom 1', 'Bathroom 2', 'Balcony', 'Other',
];
const DEFECT_TYPES = ['plumbing', 'electrical', 'flooring', 'paint', 'fixture', 'other'];
const SEVERITIES = ['minor', 'major', 'critical'];
const STATUSES = ['open', 'in_progress', 'resolved', 'signed_off'];

const SNAG_CODE_RX = /^SN-\d{4,}$/;
const SEVERITY_RANK = { critical: 0, major: 1, minor: 2 };

function makeSnagCode(seq) {
  return `SN-${String(seq).padStart(4, '0')}`;
}

function isValidSnagCode(code) {
  return typeof code === 'string' && SNAG_CODE_RX.test(code);
}

// Sign-off is only allowed once a snag has been resolved by the team.
function canSignOff(status) {
  return status === 'resolved';
}

function severityRank(severity) {
  return SEVERITY_RANK[severity] ?? 99;
}

module.exports = {
  LOCATIONS,
  DEFECT_TYPES,
  SEVERITIES,
  STATUSES,
  makeSnagCode,
  isValidSnagCode,
  canSignOff,
  severityRank,
};
