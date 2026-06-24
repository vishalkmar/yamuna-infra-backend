const { pool } = require('../config/db');

// Lead follow-up tasks (Module 2.7). Shared by agent + admin sides.
const LeadTaskModel = {
  async listByLead(leadId) {
    const [rows] = await pool.query(
      `SELECT id, lead_id AS leadId, agent_id AS agentId, title, notes,
              due_at AS dueAt, is_done AS isDone, done_at AS doneAt,
              created_by_type AS byType, created_by_name AS byName, created_at AS createdAt
       FROM lead_tasks WHERE lead_id = ?
       ORDER BY is_done ASC, (due_at IS NULL) ASC, due_at ASC, id DESC`,
      [leadId],
    );
    return rows;
  },

  // status: 'pending' | 'overdue' | 'done' | undefined(all)
  async listByAgent(agentId, status) {
    const where = ['t.agent_id = ?'];
    const params = [agentId];
    if (status === 'done') where.push('t.is_done = 1');
    else if (status === 'pending') where.push('t.is_done = 0');
    else if (status === 'overdue') where.push('t.is_done = 0 AND t.due_at IS NOT NULL AND t.due_at < NOW()');
    const [rows] = await pool.query(
      `SELECT t.id, t.lead_id AS leadId, l.name AS leadName, l.phone AS leadPhone,
              t.title, t.notes, t.due_at AS dueAt, t.is_done AS isDone, t.done_at AS doneAt,
              t.created_at AS createdAt
       FROM lead_tasks t
       LEFT JOIN leads l ON l.id = t.lead_id
       WHERE ${where.join(' AND ')}
       ORDER BY t.is_done ASC, (t.due_at IS NULL) ASC, t.due_at ASC, t.id DESC`,
      params,
    );
    return rows;
  },

  async getById(id) {
    const [rows] = await pool.query(
      `SELECT id, lead_id AS leadId, agent_id AS agentId, is_done AS isDone FROM lead_tasks WHERE id = ? LIMIT 1`,
      [id],
    );
    return rows[0] || null;
  },

  async create({ leadId, agentId, title, notes, dueAt, byType, byName }) {
    const [r] = await pool.query(
      `INSERT INTO lead_tasks (lead_id, agent_id, title, notes, due_at, created_by_type, created_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [leadId, agentId || null, title, notes || null, dueAt || null, byType, byName || null],
    );
    return { id: r.insertId };
  },

  async setDone(id, done) {
    const [r] = await pool.query(
      `UPDATE lead_tasks SET is_done = ?, done_at = ? WHERE id = ?`,
      [done ? 1 : 0, done ? new Date() : null, id],
    );
    return r.affectedRows > 0;
  },

  async remove(id) {
    const [r] = await pool.query(`DELETE FROM lead_tasks WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  },
};

module.exports = LeadTaskModel;
