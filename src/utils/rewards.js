// Pure helpers for Resident Benefits & Referrals (Modules 24–25).

const RELATIONSHIPS = ['friend', 'relative', 'colleague', 'neighbor'];
const PROJECT_STATUSES = ['pre_launch', 'launching', 'open'];
const REFERRAL_REWARD = 25000; // ₹ paid when referee books
const MOBILE_RX = /^[6-9]\d{9}$/;
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateReferral(r) {
  if (!r || typeof r.refereeName !== 'string' || r.refereeName.trim().length < 3) {
    return { ok: false, reason: 'Referee name must be at least 3 characters' };
  }
  if (!MOBILE_RX.test(r.refereePhone || '')) {
    return { ok: false, reason: 'Enter a valid 10-digit mobile (6-9)' };
  }
  if (r.refereeEmail && !EMAIL_RX.test(r.refereeEmail)) {
    return { ok: false, reason: 'Enter a valid email' };
  }
  if (!RELATIONSHIPS.includes(r.relationship)) {
    return { ok: false, reason: 'Choose a valid relationship' };
  }
  return { ok: true };
}

// Can the user afford to redeem an offer?
function canRedeem(balance, pointsCost) {
  return Number(balance) >= Number(pointsCost) && Number(pointsCost) > 0;
}

module.exports = { RELATIONSHIPS, PROJECT_STATUSES, REFERRAL_REWARD, validateReferral, canRedeem };
