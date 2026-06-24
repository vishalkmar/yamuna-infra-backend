const { pool } = require('../config/db');

const AgentNotificationModel = {
  // Broadcast to a target audience: all active agents / a tier / a single agent.
  async send({ title, body, link, audience = 'all', tierId, agentId }, createdBy) {
    let ids = [];
    if (audience === 'agent' && agentId) {
      ids = [Number(agentId)];
    } else if (audience === 'tier' && tierId) {
      const [rows] = await pool.query(`SELECT id FROM agents WHERE status = 'active' AND tier_id = ?`, [tierId]);
      ids = rows.map(r => r.id);
    } else {
      const [rows] = await pool.query(`SELECT id FROM agents WHERE status = 'active'`);
      ids = rows.map(r => r.id);
    }

    const [batch] = await pool.query(
      `INSERT INTO agent_notification_batches (title, body, audience, sent_count, created_by) VALUES (?, ?, ?, ?, ?)`,
      [title, body || null, audience, ids.length, createdBy || null],
    );
    const batchId = batch.insertId;

    if (ids.length) {
      const rows = ids.map(id => [id, batchId, title, body || null, link || null]);
      await pool.query(
        `INSERT INTO agent_notifications (agent_id, batch_id, title, body, link) VALUES ?`,
        [rows],
      );
    }
    return { batchId, count: ids.length };
  },

  async history() {
    const [rows] = await pool.query(
      `SELECT b.id, b.title, b.body, b.audience, b.sent_count AS sentCount, b.created_by AS createdBy,
              b.created_at AS createdAt,
              (SELECT COUNT(*) FROM agent_notifications n WHERE n.batch_id = b.id AND n.is_read = 1) AS readCount
       FROM agent_notification_batches b
       ORDER BY b.created_at DESC, b.id DESC LIMIT 100`,
    );
    return rows;
  },

  // ---- agent side ----
  async list(agentId) {
    const [rows] = await pool.query(
      `SELECT id, title, body, link, is_read AS isRead, read_at AS readAt, created_at AS createdAt
       FROM agent_notifications WHERE agent_id = ? ORDER BY created_at DESC, id DESC LIMIT 100`,
      [agentId],
    );
    return rows;
  },

  async unreadCount(agentId) {
    const [rows] = await pool.query(`SELECT COUNT(*) AS n FROM agent_notifications WHERE agent_id = ? AND is_read = 0`, [agentId]);
    return Number(rows[0].n || 0);
  },

  async markRead(agentId, id) {
    const [r] = await pool.query(`UPDATE agent_notifications SET is_read = 1, read_at = NOW() WHERE id = ? AND agent_id = ?`, [id, agentId]);
    return r.affectedRows > 0;
  },

  async markAll(agentId) {
    await pool.query(`UPDATE agent_notifications SET is_read = 1, read_at = NOW() WHERE agent_id = ? AND is_read = 0`, [agentId]);
  },
};

module.exports = AgentNotificationModel;
