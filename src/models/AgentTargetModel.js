const { pool } = require('../config/db');
const AppError = require('../utils/AppError');
const CommissionLedgerModel = require('./CommissionLedgerModel');

// Live achievement per target (correlated subquery over approved bookings in the
// target's own period).
const ACHIEVED = `
  CASE WHEN t.metric = 'bookings'
    THEN (SELECT COUNT(*) FROM agent_bookings b
          WHERE b.agent_id = t.agent_id AND b.status = 'approved'
            AND DATE(b.approved_at) BETWEEN t.period_start AND t.period_end)
    ELSE (SELECT COALESCE(SUM(b.deal_value), 0) FROM agent_bookings b
          WHERE b.agent_id = t.agent_id AND b.status = 'approved'
            AND DATE(b.approved_at) BETWEEN t.period_start AND t.period_end)
  END`;

const SELECT = `
  SELECT t.id, t.agent_id AS agentId, a.name AS agentName, t.title, t.metric,
         t.target_value AS targetValue, t.period_start AS periodStart, t.period_end AS periodEnd,
         t.incentive_amount AS incentiveAmount, t.status, t.notes, t.created_at AS createdAt,
         (${ACHIEVED}) AS achieved
  FROM agent_targets t
  LEFT JOIN agents a ON a.id = t.agent_id`;

const AgentTargetModel = {
  async adminList({ agentId, status } = {}) {
    const where = ['1=1'];
    const params = [];
    if (agentId) { where.push('t.agent_id = ?'); params.push(agentId); }
    if (status) { where.push('t.status = ?'); params.push(status); }
    const [rows] = await pool.query(`${SELECT} WHERE ${where.join(' AND ')} ORDER BY t.period_end DESC, t.id DESC`, params);
    return rows.map(r => ({ ...r, achieved: Number(r.achieved || 0) }));
  },

  async listByAgent(agentId) {
    const [rows] = await pool.query(`${SELECT} WHERE t.agent_id = ? ORDER BY t.period_end DESC, t.id DESC`, [agentId]);
    return rows.map(r => ({ ...r, achieved: Number(r.achieved || 0) }));
  },

  async getById(id) {
    const [rows] = await pool.query(`${SELECT} WHERE t.id = ? LIMIT 1`, [id]);
    if (!rows[0]) return null;
    return { ...rows[0], achieved: Number(rows[0].achieved || 0) };
  },

  async create(d) {
    const [r] = await pool.query(
      `INSERT INTO agent_targets (agent_id, title, metric, target_value, period_start, period_end, incentive_amount, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.agentId, d.title, d.metric || 'deal_value', d.targetValue || 0, d.periodStart, d.periodEnd, d.incentiveAmount || 0, d.notes || null],
    );
    return { id: r.insertId };
  },

  async update(id, d) {
    const [r] = await pool.query(
      `UPDATE agent_targets SET agent_id = ?, title = ?, metric = ?, target_value = ?,
              period_start = ?, period_end = ?, incentive_amount = ?, notes = ? WHERE id = ?`,
      [d.agentId, d.title, d.metric || 'deal_value', d.targetValue || 0, d.periodStart, d.periodEnd, d.incentiveAmount || 0, d.notes || null, id],
    );
    return r.affectedRows > 0;
  },

  async remove(id) {
    const [r] = await pool.query(`DELETE FROM agent_targets WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  },

  // Award the incentive: add a commission ledger adjustment + mark awarded.
  async award(id) {
    const t = await this.getById(id);
    if (!t) throw new AppError('Target not found', 404);
    if (t.status === 'awarded') throw new AppError('Incentive already awarded', 409);
    if (Number(t.incentiveAmount) > 0) {
      await CommissionLedgerModel.adjust({ agentId: t.agentId, amount: t.incentiveAmount, notes: `Incentive: ${t.title}` });
    }
    await pool.query(`UPDATE agent_targets SET status = 'awarded' WHERE id = ?`, [id]);
    return { awarded: true, amount: Number(t.incentiveAmount) };
  },
};

module.exports = AgentTargetModel;
