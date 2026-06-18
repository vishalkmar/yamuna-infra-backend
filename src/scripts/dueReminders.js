// Daily payment reminder job.
//   Sends a notification + email for every UNPAID installment whose due date is
//   within the next 3 days (inclusive of today). Intended to run once a day via
//   a scheduler (e.g. Render Cron):  node src/scripts/dueReminders.js
//
//   "3 days before, every day" → run daily; an installment due in 3/2/1/0 days
//   gets one reminder each day until it is paid.

require('dotenv').config();
const { pool } = require('../config/db');
const { notifyDueSoon } = require('../services/paymentNotify');

async function run() {
  const [rows] = await pool.query(
    `SELECT pi.id, pi.label, pi.amount, pi.late_fee, pi.due_date,
            DATEDIFF(pi.due_date, CURDATE()) AS daysLeft,
            up.id AS propertyId, up.label AS propLabel, up.flat_no AS flatNo,
            u.id AS userId, u.name AS residentName, u.email AS residentEmail
     FROM property_installments pi
     JOIN user_properties up ON up.id = pi.property_id
     JOIN users u ON u.id = up.user_id
     WHERE pi.is_paid = 0
       AND pi.due_date IS NOT NULL
       AND pi.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)
       AND u.is_active = 1`,
  );

  console.log(`[reminders] ${rows.length} installment(s) due within 3 days`);
  let sent = 0;
  for (const r of rows) {
    const ctx = {
      userId: r.userId, residentName: r.residentName, residentEmail: r.residentEmail,
      label: r.propLabel, flatNo: r.flatNo, propertyId: r.propertyId,
    };
    try {
      await notifyDueSoon(ctx, { label: r.label, amount: r.amount, late_fee: r.late_fee, due_date: r.due_date }, Number(r.daysLeft));
      sent += 1;
    } catch (e) {
      console.warn('[reminders] failed for installment', r.id, '-', e.message);
    }
  }
  console.log(`[reminders] done — ${sent} reminder(s) dispatched`);
}

run()
  .then(() => pool.end())
  .catch(err => { console.error('[reminders] fatal:', err.message); process.exit(1); });
