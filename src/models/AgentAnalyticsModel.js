const { pool } = require('../config/db');

// Performance analytics (Module 4.7). All metrics are date-bounded; leads/visits/
// bookings by created_at, approved metrics by approved_at, commission by ledger
// created_at. No new table.
function range(from, to) {
  return [from || '1970-01-01', to || new Date().toISOString().slice(0, 10)];
}

const AgentAnalyticsModel = {
  async perAgent({ from, to } = {}) {
    const [f, t] = range(from, to);
    const p = [f, t, f, t, f, t, f, t, f, t, f, t]; // 6 subqueries × 2
    const [rows] = await pool.query(
      `SELECT a.id AS agentId, a.name AS agentName, a.company_name AS companyName,
        (SELECT COUNT(*) FROM leads l WHERE l.agent_id = a.id AND DATE(l.created_at) BETWEEN ? AND ?) AS leads,
        (SELECT COUNT(*) FROM agent_site_visits v WHERE v.agent_id = a.id AND DATE(v.created_at) BETWEEN ? AND ?) AS visits,
        (SELECT COUNT(*) FROM agent_bookings b WHERE b.agent_id = a.id AND DATE(b.created_at) BETWEEN ? AND ?) AS bookings,
        (SELECT COUNT(*) FROM agent_bookings b WHERE b.agent_id = a.id AND b.status = 'approved' AND DATE(b.approved_at) BETWEEN ? AND ?) AS approved,
        (SELECT COALESCE(SUM(b.deal_value),0) FROM agent_bookings b WHERE b.agent_id = a.id AND b.status = 'approved' AND DATE(b.approved_at) BETWEEN ? AND ?) AS dealValue,
        (SELECT COALESCE(SUM(cl.amount),0) FROM commission_ledger cl WHERE cl.agent_id = a.id AND cl.status <> 'reversed' AND DATE(cl.created_at) BETWEEN ? AND ?) AS commission
       FROM agents a
       WHERE a.status = 'active'
       ORDER BY dealValue DESC, a.id ASC`,
      p,
    );
    return rows.map(r => {
      const leads = Number(r.leads || 0);
      const approved = Number(r.approved || 0);
      return {
        agentId: r.agentId, agentName: r.agentName, companyName: r.companyName,
        leads, visits: Number(r.visits || 0), bookings: Number(r.bookings || 0), approved,
        dealValue: Number(r.dealValue || 0), commission: Number(r.commission || 0),
        conversion: leads > 0 ? Math.round((approved / leads) * 100) : 0,
      };
    });
  },

  async funnel({ from, to } = {}) {
    const [f, t] = range(from, to);
    const [rows] = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM leads WHERE DATE(created_at) BETWEEN ? AND ?) AS leads,
        (SELECT COUNT(*) FROM agent_site_visits WHERE DATE(created_at) BETWEEN ? AND ?) AS visits,
        (SELECT COUNT(*) FROM agent_bookings WHERE DATE(created_at) BETWEEN ? AND ?) AS bookings,
        (SELECT COUNT(*) FROM agent_bookings WHERE status = 'approved' AND DATE(approved_at) BETWEEN ? AND ?) AS approved,
        (SELECT COALESCE(SUM(deal_value),0) FROM agent_bookings WHERE status = 'approved' AND DATE(approved_at) BETWEEN ? AND ?) AS dealValue`,
      [f, t, f, t, f, t, f, t, f, t],
    );
    const s = rows[0] || {};
    const leads = Number(s.leads || 0);
    const approved = Number(s.approved || 0);
    return {
      leads, visits: Number(s.visits || 0), bookings: Number(s.bookings || 0), approved,
      dealValue: Number(s.dealValue || 0),
      conversion: leads > 0 ? Math.round((approved / leads) * 100) : 0,
    };
  },
};

module.exports = AgentAnalyticsModel;
