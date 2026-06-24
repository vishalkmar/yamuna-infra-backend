const { pool } = require('../config/db');

// Agent self-service site visits (Module 3.1). Agent sees/edits only their own.
const SELECT = `
  SELECT v.id, v.lead_id AS leadId, l.name AS leadName, l.phone AS leadPhone,
         v.agent_id AS agentId, v.project_id AS projectId, p.name AS projectName,
         v.unit_id AS unitId, u.unit_no AS unitNo,
         v.scheduled_at AS scheduledAt, v.slot, v.status, v.checked_in_at AS checkedInAt,
         v.outcome, v.feedback, v.notes, v.created_at AS createdAt
  FROM agent_site_visits v
  LEFT JOIN leads l ON l.id = v.lead_id
  LEFT JOIN agent_projects p ON p.id = v.project_id
  LEFT JOIN units u ON u.id = v.unit_id`;

const AgentVisitModel = {
  async list(agentId, { status } = {}) {
    const where = ['v.agent_id = ?'];
    const params = [agentId];
    if (status) { where.push('v.status = ?'); params.push(status); }
    const [rows] = await pool.query(`${SELECT} WHERE ${where.join(' AND ')} ORDER BY v.scheduled_at DESC, v.id DESC`, params);
    return rows;
  },

  async getOwned(agentId, id) {
    const [rows] = await pool.query(`${SELECT} WHERE v.id = ? AND v.agent_id = ? LIMIT 1`, [id, agentId]);
    return rows[0] || null;
  },

  async create(agentId, d) {
    const [r] = await pool.query(
      `INSERT INTO agent_site_visits
        (lead_id, agent_id, project_id, unit_id, scheduled_at, slot, status, notes, created_by_type, created_by_name)
       VALUES (?, ?, ?, ?, ?, ?, 'requested', ?, 'agent', ?)`,
      [d.leadId, agentId, d.projectId || null, d.unitId || null, d.scheduledAt, d.slot || null, d.notes || null, d.byName || null],
    );
    return { id: r.insertId };
  },

  async cancel(agentId, id) {
    const [r] = await pool.query(
      `UPDATE agent_site_visits SET status = 'cancelled'
       WHERE id = ? AND agent_id = ? AND status IN ('requested','confirmed')`,
      [id, agentId],
    );
    return r.affectedRows > 0;
  },

  // Mark buyer arrived (Module 3.3) — only own, not already cancelled/no_show.
  async checkIn(agentId, id) {
    const [r] = await pool.query(
      `UPDATE agent_site_visits SET checked_in_at = COALESCE(checked_in_at, NOW())
       WHERE id = ? AND agent_id = ? AND status IN ('requested','confirmed')`,
      [id, agentId],
    );
    return r.affectedRows > 0;
  },

  // Record the visit result — completed (with outcome/feedback) or no_show.
  async recordOutcome(agentId, id, { status, outcome, feedback }) {
    const [r] = await pool.query(
      `UPDATE agent_site_visits
       SET status = ?, outcome = ?, feedback = ?,
           checked_in_at = IF(? = 'completed', COALESCE(checked_in_at, NOW()), checked_in_at)
       WHERE id = ? AND agent_id = ?`,
      [status, outcome || null, feedback || null, status, id, agentId],
    );
    return r.affectedRows > 0;
  },
};

module.exports = AgentVisitModel;
