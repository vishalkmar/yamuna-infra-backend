const { pool } = require('../config/db');

// BI aggregates (Module 5.8). Monthly sales/commission trend + inventory health.
function lastMonths(n) {
  const out = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

const AgentBiModel = {
  async trend(months = 6) {
    const keys = lastMonths(months);
    const [bookings] = await pool.query(
      `SELECT DATE_FORMAT(approved_at, '%Y-%m') AS ym, COUNT(*) AS bookings, COALESCE(SUM(deal_value),0) AS dealValue
       FROM agent_bookings
       WHERE status = 'approved' AND approved_at >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL ? MONTH)
       GROUP BY ym`,
      [months - 1],
    );
    const [commission] = await pool.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS ym, COALESCE(SUM(amount),0) AS commission
       FROM commission_ledger
       WHERE status <> 'reversed' AND created_at >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL ? MONTH)
       GROUP BY ym`,
      [months - 1],
    );
    const bMap = Object.fromEntries(bookings.map(r => [r.ym, r]));
    const cMap = Object.fromEntries(commission.map(r => [r.ym, r]));
    return keys.map(ym => ({
      ym,
      bookings: Number(bMap[ym]?.bookings || 0),
      dealValue: Number(bMap[ym]?.dealValue || 0),
      commission: Number(cMap[ym]?.commission || 0),
    }));
  },

  async inventory() {
    const [statusRows] = await pool.query(`SELECT status, COUNT(*) AS c FROM units GROUP BY status`);
    const health = { available: 0, held: 0, blocked: 0, booked: 0, sold: 0 };
    statusRows.forEach(r => { health[r.status] = Number(r.c); });
    const [projects] = await pool.query(
      `SELECT p.name, COUNT(u.id) AS total,
              SUM(u.status = 'available') AS available, SUM(u.status = 'sold') AS sold
       FROM agent_projects p LEFT JOIN units u ON u.project_id = p.id
       GROUP BY p.id ORDER BY total DESC LIMIT 10`,
    );
    return {
      health,
      projects: projects.map(p => ({ name: p.name, total: Number(p.total || 0), available: Number(p.available || 0), sold: Number(p.sold || 0) })),
    };
  },
};

module.exports = AgentBiModel;
