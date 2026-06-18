const { sendEmail } = require('./emailService');
const { pool } = require('../config/db');

const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN');

// Fired when an installment is recorded as paid (admin counter or online).
// Sends a confirmation email to the resident + drops an in-app notification.
async function notifyPaid(ctx, inst, { source } = {}) {
  const amount = inst.paidAmount ?? inst.amount;
  const via = source === 'online' ? 'online payment' : 'the office counter';

  await pool.query(
    `INSERT INTO notifications (user_id, title, body, category, icon, link)
     VALUES (?, ?, ?, 'payment', '✅', ?)`,
    [ctx.userId, 'Payment received',
     `${inr(amount)} received for ${inst.label}. Thank you!`, `payment:${ctx.propertyId}`],
  );

  if (ctx.residentEmail) {
    const subject = `Payment received — ${inr(amount)} | Yamuna Infra`;
    const text = `Dear ${ctx.residentName || 'Resident'},\n\n`
      + `We have received your payment of ${inr(amount)} for "${inst.label}" `
      + `(${ctx.label || ctx.flatNo || 'your property'}) via ${via}.\n\n`
      + `Transaction: ${inst.txnId || 'N/A'}\n\nThank you,\nShri Yamuna Infra`;
    const html = `<p>Dear ${ctx.residentName || 'Resident'},</p>`
      + `<p>We have received your payment of <b>${inr(amount)}</b> for <b>${inst.label}</b> `
      + `(${ctx.label || ctx.flatNo || 'your property'}) via ${via}.</p>`
      + `<p>Transaction: <b>${inst.txnId || 'N/A'}</b></p>`
      + `<p>Thank you,<br/>Shri Yamuna Infra</p>`;
    // Never blocks the flow — emailService resolves even on SMTP failure.
    await sendEmail(ctx.residentEmail, subject, text, html);
  }
}

// Fired by the daily reminder job before a due date.
async function notifyDueSoon(ctx, inst, daysLeft) {
  const amount = Number(inst.amount) + Number(inst.late_fee || 0);
  const when = daysLeft === 0 ? 'is due today' : `is due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
  await pool.query(
    `INSERT INTO notifications (user_id, title, body, category, icon, link)
     VALUES (?, ?, ?, 'payment', '⏰', ?)`,
    [ctx.userId, 'Payment reminder',
     `${inr(amount)} for ${inst.label} ${when}. Please pay on time.`, `payment:${ctx.propertyId}`],
  );
  if (ctx.residentEmail) {
    const subject = `Reminder: ${inr(amount)} ${when} | Yamuna Infra`;
    const text = `Dear ${ctx.residentName || 'Resident'},\n\nYour installment "${inst.label}" of ${inr(amount)} ${when} `
      + `(due ${String(inst.due_date).slice(0, 10)}). Please make the payment on time.\n\nShri Yamuna Infra`;
    await sendEmail(ctx.residentEmail, subject, text);
  }
}

module.exports = { notifyPaid, notifyDueSoon };
