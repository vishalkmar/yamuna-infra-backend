// Weight-based progress computation.
// Each milestone contributes `weight × completionFactor` to the total.
//   completed   → 100%
//   in_progress → 50%
//   pending     → 0%
// Final percentage is rounded to the nearest whole number.

const FACTOR = {
  completed:   1.0,
  in_progress: 0.5,
  pending:     0.0,
};

function computeProgress(milestones) {
  if (!milestones?.length) return 0;
  let totalWeight = 0;
  let earned = 0;
  for (const m of milestones) {
    const w = Number(m.weight) || 1;
    const f = FACTOR[m.status] !== undefined ? FACTOR[m.status] : 0;
    totalWeight += w;
    earned += w * f;
  }
  if (totalWeight === 0) return 0;
  return Math.round((earned / totalWeight) * 100);
}

function currentMilestone(milestones) {
  if (!milestones?.length) return null;
  return milestones.find(m => m.status === 'in_progress')
    || milestones.find(m => m.status === 'pending')
    || milestones[milestones.length - 1];
}

module.exports = { computeProgress, currentMilestone, FACTOR };
