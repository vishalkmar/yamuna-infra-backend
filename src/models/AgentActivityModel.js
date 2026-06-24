const { pool } = require('../config/db');

// Agent activity trail (Module 1.9).
const AgentActivityModel = {
  async record({ agentId, action, entity, entityId, path, statusCode }) {
    try {
      await pool.query(
        `INSERT INTO agent_activity_log (agent_id, action, entity, entity_id, path, status_code)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [agentId || null, action, entity || null, entityId || null, path || null, statusCode || null],
      );
    } catch (e) { /* logging must never break a request */ }
  },

  async listByAgent(agentId, limit = 50) {
    const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const [rows] = await pool.query(
      `SELECT id, action, entity, entity_id AS entityId, path, status_code AS statusCode, created_at AS createdAt
       FROM agent_activity_log WHERE agent_id = ?
       ORDER BY created_at DESC, id DESC LIMIT ?`,
      [agentId, lim],
    );
    return rows;
  },
};

module.exports = AgentActivityModel;
