const { pool } = require('../config/db');
const AppError = require('../utils/AppError');

const SELECT = `
  SELECT p.id, p.agent_id AS agentId, a.name AS agentName, p.amount, p.tds, p.net,
         p.status, p.method, p.txn_ref AS txnRef, p.reject_reason AS rejectReason,
         p.notes, p.processed_by AS processedBy, p.processed_at AS processedAt,
         p.created_at AS createdAt
  FROM payout_requests p
  LEFT JOIN agents a ON a.id = p.agent_id`;

const PayoutModel = {
  // Agent withdraws all their APPROVED, unpaid commission into a new payout.
  async createForAgent(agentId) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [rows] = await conn.query(
        `SELECT id, amount FROM commission_ledger
         WHERE agent_id = ? AND status = 'approved' AND payout_id IS NULL FOR UPDATE`,
        [agentId],
      );
      if (rows.length === 0) throw new AppError('No approved commission available to withdraw', 400);
      const amount = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
      const [pr] = await conn.query(
        `INSERT INTO payout_requests (agent_id, amount, tds, net, status) VALUES (?, ?, 0, ?, 'requested')`,
        [agentId, amount, amount],
      );
      const payoutId = pr.insertId;
      const ids = rows.map(r => r.id);
      await conn.query(`UPDATE commission_ledger SET payout_id = ? WHERE id IN (?)`, [payoutId, ids]);
      await conn.commit();
      return { id: payoutId, amount, entries: ids.length };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  },

  async listByAgent(agentId) {
    const [rows] = await pool.query(`${SELECT} WHERE p.agent_id = ? ORDER BY p.created_at DESC, p.id DESC`, [agentId]);
    return rows;
  },

  async adminList({ status, agentId, page = 1, pageSize = 20 } = {}) {
    const where = ['1=1'];
    const params = [];
    if (status) { where.push('p.status = ?'); params.push(status); }
    if (agentId) { where.push('p.agent_id = ?'); params.push(agentId); }
    const whereSql = where.join(' AND ');
    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM payout_requests p WHERE ${whereSql}`, params);
    const total = countRows[0].total;
    const limit = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
    const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;
    const [rows] = await pool.query(`${SELECT} WHERE ${whereSql} ORDER BY p.created_at DESC, p.id DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
    return { rows, total, page: Math.max(parseInt(page, 10) || 1, 1), pageSize: limit };
  },

  async getById(id) {
    const [rows] = await pool.query(`${SELECT} WHERE p.id = ? LIMIT 1`, [id]);
    if (!rows[0]) return null;
    const [items] = await pool.query(
      `SELECT cl.id, cl.amount, cl.deal_value AS dealValue, cl.rule_snapshot AS ruleSnapshot,
              cl.booking_id AS bookingId, b.buyer_name AS buyerName
       FROM commission_ledger cl LEFT JOIN agent_bookings b ON b.id = cl.booking_id
       WHERE cl.payout_id = ? ORDER BY cl.id ASC`,
      [id],
    );
    return { ...rows[0], items };
  },

  // Status transition with ledger sync. paid → ledger rows 'paid'; rejected →
  // release ledger rows (back to approved, unlinked).
  async setStatus(id, status, { txnRef, method, reason, processedBy, tdsPercent } = {}) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [rows] = await conn.query(`SELECT id, status, amount FROM payout_requests WHERE id = ? FOR UPDATE`, [id]);
      const p = rows[0];
      if (!p) throw new AppError('Payout not found', 404);

      // Apply TDS whenever a percentage is supplied (recomputes net).
      if (tdsPercent != null && tdsPercent !== '') {
        const tds = +((Number(p.amount) || 0) * (Number(tdsPercent) || 0) / 100).toFixed(2);
        const net = +((Number(p.amount) || 0) - tds).toFixed(2);
        await conn.query(`UPDATE payout_requests SET tds = ?, net = ? WHERE id = ?`, [tds, net, id]);
      }

      if (status === 'paid') {
        await conn.query(
          `UPDATE payout_requests SET status = 'paid', txn_ref = ?, method = ?, processed_by = ?, processed_at = NOW() WHERE id = ?`,
          [txnRef || null, method || null, processedBy || null, id],
        );
        await conn.query(`UPDATE commission_ledger SET status = 'paid' WHERE payout_id = ?`, [id]);
      } else if (status === 'rejected') {
        await conn.query(
          `UPDATE payout_requests SET status = 'rejected', reject_reason = ?, processed_by = ?, processed_at = NOW() WHERE id = ?`,
          [reason || null, processedBy || null, id],
        );
        await conn.query(`UPDATE commission_ledger SET payout_id = NULL WHERE payout_id = ?`, [id]);
      } else {
        await conn.query(`UPDATE payout_requests SET status = ?, processed_by = ? WHERE id = ?`, [status, processedBy || null, id]);
      }
      await conn.commit();
      return true;
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  },

  async stats() {
    const [rows] = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN status IN ('requested','approved','processing') THEN amount ELSE 0 END), 0) AS pending,
         COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS paid,
         SUM(status = 'requested') AS requestedCount
       FROM payout_requests`,
    );
    const s = rows[0] || {};
    return { pending: Number(s.pending || 0), paid: Number(s.paid || 0), requestedCount: Number(s.requestedCount || 0) };
  },
};

module.exports = PayoutModel;
