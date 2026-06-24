const { pool } = require('../config/db');

// Admin view of all site visits (Module 3.1; confirmation 3.2 / check-in 3.3).
const SELECT = `
  SELECT v.id, v.lead_id AS leadId, l.name AS leadName, l.phone AS leadPhone,
         v.agent_id AS agentId, a.name AS agentName,
         v.project_id AS projectId, p.name AS projectName,
         v.unit_id AS unitId, u.unit_no AS unitNo,
         v.scheduled_at AS scheduledAt, v.slot, v.status, v.checked_in_at AS checkedInAt,
         v.outcome, v.feedback, v.notes, v.created_at AS createdAt
  FROM agent_site_visits v
  LEFT JOIN leads l ON l.id = v.lead_id
  LEFT JOIN agents a ON a.id = v.agent_id
  LEFT JOIN agent_projects p ON p.id = v.project_id
  LEFT JOIN units u ON u.id = v.unit_id`;

const AdminVisitModel = {
  async list({ status, agentId, projectId, date, search, page = 1, pageSize = 20 } = {}) {
    const where = ['1=1'];
    const params = [];
    if (status) { where.push('v.status = ?'); params.push(status); }
    if (agentId) { where.push('v.agent_id = ?'); params.push(agentId); }
    if (projectId) { where.push('v.project_id = ?'); params.push(projectId); }
    if (date) { where.push('DATE(v.scheduled_at) = ?'); params.push(date); }
    if (search) { where.push('(l.name LIKE ? OR l.phone LIKE ?)'); const s = `%${search}%`; params.push(s, s); }
    const whereSql = where.join(' AND ');

    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM agent_site_visits v LEFT JOIN leads l ON l.id = v.lead_id WHERE ${whereSql}`, params);
    const total = countRows[0].total;
    const limit = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
    const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;
    const [rows] = await pool.query(`${SELECT} WHERE ${whereSql} ORDER BY v.scheduled_at DESC, v.id DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
    return { rows, total, page: Math.max(parseInt(page, 10) || 1, 1), pageSize: limit };
  },

  async getById(id) {
    const [rows] = await pool.query(`${SELECT} WHERE v.id = ? LIMIT 1`, [id]);
    return rows[0] || null;
  },

  async stats() {
    const [rows] = await pool.query(
      `SELECT
         COUNT(*) AS total,
         SUM(status = 'requested') AS requested,
         SUM(status = 'confirmed') AS confirmed,
         SUM(status = 'completed') AS completed,
         SUM(DATE(scheduled_at) = CURDATE() AND status IN ('requested','confirmed')) AS today
       FROM agent_site_visits`,
    );
    const s = rows[0] || {};
    return {
      total: Number(s.total || 0), requested: Number(s.requested || 0),
      confirmed: Number(s.confirmed || 0), completed: Number(s.completed || 0),
      today: Number(s.today || 0),
    };
  },

  async checkIn(id) {
    const [r] = await pool.query(
      `UPDATE agent_site_visits SET checked_in_at = COALESCE(checked_in_at, NOW())
       WHERE id = ? AND status IN ('requested','confirmed')`,
      [id],
    );
    return r.affectedRows > 0;
  },

  async setStatus(id, status, { outcome, feedback } = {}) {
    const checkedIn = status === 'completed' ? ', checked_in_at = COALESCE(checked_in_at, NOW())' : '';
    const [r] = await pool.query(
      `UPDATE agent_site_visits SET status = ?, outcome = COALESCE(?, outcome), feedback = COALESCE(?, feedback)${checkedIn} WHERE id = ?`,
      [status, outcome ?? null, feedback ?? null, id],
    );
    return r.affectedRows > 0;
  },
};

module.exports = AdminVisitModel;
