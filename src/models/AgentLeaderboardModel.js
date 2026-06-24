const { pool } = require('../config/db');

// Leaderboard (Module 4.6) — ranks active agents by a metric over a period.
// No new table; computed from approved bookings + commission ledger.
const METRIC_COL = { bookings: 'bookings', dealValue: 'dealValue', commission: 'commission' };

const AgentLeaderboardModel = {
  async ranking({ metric = 'dealValue', from, to } = {}) {
    const col = METRIC_COL[metric] || 'dealValue';
    const f = from || '1970-01-01';
    const t = to || new Date().toISOString().slice(0, 10);
    const [rows] = await pool.query(
      `SELECT a.id AS agentId, a.name AS agentName, a.company_name AS companyName,
              COUNT(DISTINCT b.id) AS bookings,
              COALESCE(SUM(b.deal_value), 0) AS dealValue,
              (SELECT COALESCE(SUM(cl.amount), 0) FROM commission_ledger cl
               WHERE cl.agent_id = a.id AND cl.status <> 'reversed'
                 AND DATE(cl.created_at) BETWEEN ? AND ?) AS commission
       FROM agents a
       LEFT JOIN agent_bookings b ON b.agent_id = a.id AND b.status = 'approved'
            AND DATE(b.approved_at) BETWEEN ? AND ?
       WHERE a.status = 'active'
       GROUP BY a.id, a.name, a.company_name
       ORDER BY ${col} DESC, a.id ASC
       LIMIT 100`,
      [f, t, f, t],
    );
    return rows.map((r, i) => ({
      rank: i + 1,
      agentId: r.agentId,
      agentName: r.agentName,
      companyName: r.companyName,
      bookings: Number(r.bookings || 0),
      dealValue: Number(r.dealValue || 0),
      commission: Number(r.commission || 0),
    }));
  },
};

module.exports = AgentLeaderboardModel;
