const { pool } = require('../config/db');

const SELECT = `
  SELECT cl.id, cl.agent_id AS agentId, a.name AS agentName,
         cl.booking_id AS bookingId, b.buyer_name AS buyerName,
         cl.rule_id AS ruleId, cl.deal_value AS dealValue, cl.amount, cl.status,
         cl.rule_snapshot AS ruleSnapshot, cl.payout_id AS payoutId, cl.notes,
         cl.created_at AS createdAt
  FROM commission_ledger cl
  LEFT JOIN agents a ON a.id = cl.agent_id
  LEFT JOIN agent_bookings b ON b.id = cl.booking_id`;

const CommissionLedgerModel = {
  // Insert an accrual. `conn` optional (use the booking-approval transaction).
  async create(d, conn = pool) {
    const [r] = await conn.query(
      `INSERT INTO commission_ledger
        (agent_id, booking_id, rule_id, deal_value, amount, status, rule_snapshot, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.agentId || null, d.bookingId || null, d.ruleId || null, d.dealValue || 0,
       d.amount || 0, d.status || 'accrued', d.ruleSnapshot || null, d.notes || null],
    );
    return { id: r.insertId };
  },

  // Reverse all live entries for a booking (on cancellation). conn optional.
  async reverseForBooking(bookingId, conn = pool) {
    await conn.query(
      `UPDATE commission_ledger SET status = 'reversed'
       WHERE booking_id = ? AND status IN ('accrued','approved')`,
      [bookingId],
    );
  },

  async adminList({ status, agentId, page = 1, pageSize = 20 } = {}) {
    const where = ['1=1'];
    const params = [];
    if (status) { where.push('cl.status = ?'); params.push(status); }
    if (agentId) { where.push('cl.agent_id = ?'); params.push(agentId); }
    const whereSql = where.join(' AND ');
    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM commission_ledger cl WHERE ${whereSql}`, params);
    const total = countRows[0].total;
    const limit = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
    const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;
    const [rows] = await pool.query(`${SELECT} WHERE ${whereSql} ORDER BY cl.created_at DESC, cl.id DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
    return { rows, total, page: Math.max(parseInt(page, 10) || 1, 1), pageSize: limit };
  },

  async listByAgent(agentId, { status } = {}) {
    const where = ['cl.agent_id = ?'];
    const params = [agentId];
    if (status) { where.push('cl.status = ?'); params.push(status); }
    const [rows] = await pool.query(`${SELECT} WHERE ${where.join(' AND ')} ORDER BY cl.created_at DESC, cl.id DESC`, params);
    return rows;
  },

  async getById(id) {
    const [rows] = await pool.query(`SELECT id, agent_id AS agentId, status FROM commission_ledger WHERE id = ? LIMIT 1`, [id]);
    return rows[0] || null;
  },

  async setStatus(id, status) {
    const [r] = await pool.query(`UPDATE commission_ledger SET status = ? WHERE id = ?`, [status, id]);
    return r.affectedRows > 0;
  },

  // Manual adjustment entry (bonus/clawback) not tied to a booking.
  async adjust({ agentId, amount, notes }) {
    const [r] = await pool.query(
      `INSERT INTO commission_ledger (agent_id, deal_value, amount, status, rule_snapshot, notes)
       VALUES (?, 0, ?, 'approved', 'Manual adjustment', ?)`,
      [agentId || null, amount || 0, notes || null],
    );
    return { id: r.insertId };
  },

  // Overall ledger totals (admin dashboard).
  async adminStats() {
    const [rows] = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN status = 'accrued' THEN amount ELSE 0 END), 0) AS accrued,
         COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) AS approved,
         COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS paid
       FROM commission_ledger`,
    );
    const s = rows[0] || {};
    return { accrued: Number(s.accrued || 0), approved: Number(s.approved || 0), paid: Number(s.paid || 0) };
  },

  // Totals for an agent (feeds payouts 4.3 + earnings views).
  async totals(agentId) {
    const [rows] = await pool.query(
      `SELECT
         COALESCE(SUM(amount), 0) AS lifetime,
         COALESCE(SUM(CASE WHEN status = 'accrued' THEN amount ELSE 0 END), 0) AS accrued,
         COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) AS approved,
         COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS paid
       FROM commission_ledger WHERE agent_id = ? AND status <> 'reversed'`,
      [agentId],
    );
    const s = rows[0] || {};
    return { lifetime: Number(s.lifetime || 0), accrued: Number(s.accrued || 0), approved: Number(s.approved || 0), paid: Number(s.paid || 0) };
  },
};

module.exports = CommissionLedgerModel;
