const PaymentModel = require('../models/PaymentModel');

// Configurable late-fee policy. Defaults to 1.5% of installment per month overdue,
// capped at 6 months. Customise in env/db later.
const LATE_FEE_RATE_PER_MONTH = 0.015;
const LATE_FEE_MAX_MONTHS = 6;

function monthsBetween(a, b) {
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24 * 30)));
}

// Auto-mark "due" installments as "overdue" if the due date has passed,
// and apply late-fee deltas if no fee has been applied for that period yet.
async function reconcileOverdueForBooking(bookingCode) {
  await PaymentModel.markOverdueForBooking(bookingCode);

  const schedule = await PaymentModel.getSchedule(bookingCode);
  const now = new Date();

  for (const inst of schedule) {
    if (inst.status !== 'overdue') continue;
    const due = inst.dueDate instanceof Date ? inst.dueDate : new Date(inst.dueDate);
    const monthsLate = Math.min(LATE_FEE_MAX_MONTHS, monthsBetween(due, now));
    const expectedFee = Math.round(Number(inst.amount) * LATE_FEE_RATE_PER_MONTH * monthsLate);
    const currentFee = Number(inst.lateFee || 0);
    const delta = expectedFee - currentFee;
    if (delta > 0) {
      await PaymentModel.applyLateFee({
        installmentId: inst.id,
        amount: delta,
        reason: `Auto: ${monthsLate} month(s) late @ ${(LATE_FEE_RATE_PER_MONTH * 100).toFixed(1)}%/month`,
      });
    }
  }
}

module.exports = {
  reconcileOverdueForBooking,
  LATE_FEE_RATE_PER_MONTH,
  LATE_FEE_MAX_MONTHS,
};
