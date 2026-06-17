const { pool } = require('../config/db');

const OWNER_NAME = `(SELECT u.name FROM booking_owners bo JOIN users u ON u.id = bo.user_id
   WHERE bo.booking_id = p.booking_id ORDER BY (bo.role = 'primary') DESC, u.id LIMIT 1)`;
const OWNER_MOBILE = `(SELECT u.mobile FROM booking_owners bo JOIN users u ON u.id = bo.user_id
   WHERE bo.booking_id = p.booking_id ORDER BY (bo.role = 'primary') DESC, u.id LIMIT 1)`;

function buildWhere({ status, method, from, to, search }) {
  const where = ['1=1'];
  const params = [];
  if (status) { where.push('p.status = ?'); params.push(status); }
  if (method) { where.push('p.method = ?'); params.push(method); }
  if (from) { where.push('p.paid_at >= ?'); params.push(`${from} 00:00:00`); }
  if (to) { where.push('p.paid_at <= ?'); params.push(`${to} 23:59:59`); }
  if (search) {
    where.push('(p.txn_id LIKE ? OR p.remarks LIKE ? OR b.booking_code LIKE ? OR b.unit_number LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }
  return { whereSql: where.join(' AND '), params };
}

const SELECT_COLS = `
  p.id, p.txn_id AS txnId, p.cashfree_order_id AS cashfreeOrderId, p.amount, p.method, p.status,
  p.remarks, p.paid_at AS paidAt, b.booking_code AS bookingCode, b.unit_number AS unit,
  i.label AS installmentLabel, ${OWNER_NAME} AS userName, ${OWNER_MOBILE} AS userMobile`;
const FROM_JOINS = `
  FROM payments p
  LEFT JOIN bookings b ON b.id = p.booking_id
  LEFT JOIN installments i ON i.id = p.installment_id`;

const AdminPaymentModel = {
  async list(filters = {}) {
    const { whereSql, params } = buildWhere(filters);
    const [cnt] = await pool.query(`SELECT COUNT(*) AS total ${FROM_JOINS} WHERE ${whereSql}`, params);
    const limit = Math.min(Math.max(parseInt(filters.pageSize, 10) || 20, 1), 100);
    const offset = (Math.max(parseInt(filters.page, 10) || 1, 1) - 1) * limit;
    const [rows] = await pool.query(
      `SELECT ${SELECT_COLS} ${FROM_JOINS} WHERE ${whereSql} ORDER BY p.paid_at DESC, p.id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { rows, total: cnt[0].total, page: Math.max(parseInt(filters.page, 10) || 1, 1), pageSize: limit };
  },

  // Totals by status for the summary cards.
  async summary(filters = {}) {
    const { whereSql, params } = buildWhere(filters);
    const [rows] = await pool.query(
      `SELECT p.status, COUNT(*) AS count, COALESCE(SUM(p.amount),0) AS amount
       ${FROM_JOINS} WHERE ${whereSql} GROUP BY p.status`,
      params,
    );
    const out = { success: { count: 0, amount: 0 }, failed: { count: 0, amount: 0 }, refunded: { count: 0, amount: 0 } };
    for (const r of rows) out[r.status] = { count: Number(r.count), amount: Number(r.amount) };
    return out;
  },

  // All matching rows (no pagination) for CSV export.
  async exportRows(filters = {}) {
    const { whereSql, params } = buildWhere(filters);
    const [rows] = await pool.query(
      `SELECT ${SELECT_COLS} ${FROM_JOINS} WHERE ${whereSql} ORDER BY p.paid_at DESC, p.id DESC LIMIT 5000`,
      params,
    );
    return rows;
  },

  async methods() {
    const [rows] = await pool.query(`SELECT DISTINCT method FROM payments WHERE method IS NOT NULL ORDER BY method`);
    return rows.map(r => r.method);
  },

  async refund(id) {
    const [r] = await pool.query(
      `UPDATE payments SET status = 'refunded',
              remarks = TRIM(CONCAT(COALESCE(remarks,''), ' [refunded by admin]'))
       WHERE id = ? AND status = 'success'`,
      [id],
    );
    return r.affectedRows > 0;
  },
};

module.exports = AdminPaymentModel;
