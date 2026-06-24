const { pool } = require('../config/db');

const LIST = `
  SELECT t.id, t.agent_id AS agentId, a.name AS agentName, t.subject, t.category,
         t.status, t.priority, t.last_message_at AS lastMessageAt, t.created_at AS createdAt
  FROM agent_tickets t LEFT JOIN agents a ON a.id = t.agent_id`;

const AgentTicketModel = {
  async create(agentId, { subject, category, body }) {
    const [t] = await pool.query(
      `INSERT INTO agent_tickets (agent_id, subject, category, last_message_at) VALUES (?, ?, ?, NOW())`,
      [agentId, subject, category || null],
    );
    const ticketId = t.insertId;
    await pool.query(
      `INSERT INTO agent_ticket_messages (ticket_id, sender_type, sender_name, body) VALUES (?, 'agent', NULL, ?)`,
      [ticketId, body],
    );
    return { id: ticketId };
  },

  async listByAgent(agentId) {
    const [rows] = await pool.query(`${LIST} WHERE t.agent_id = ? ORDER BY t.last_message_at DESC, t.id DESC`, [agentId]);
    return rows;
  },

  async adminList({ status, agentId, page = 1, pageSize = 20 } = {}) {
    const where = ['1=1'];
    const params = [];
    if (status) { where.push('t.status = ?'); params.push(status); }
    if (agentId) { where.push('t.agent_id = ?'); params.push(agentId); }
    const whereSql = where.join(' AND ');
    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM agent_tickets t WHERE ${whereSql}`, params);
    const total = countRows[0].total;
    const limit = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
    const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;
    const [rows] = await pool.query(`${LIST} WHERE ${whereSql} ORDER BY t.last_message_at DESC, t.id DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
    return { rows, total, page: Math.max(parseInt(page, 10) || 1, 1), pageSize: limit };
  },

  async getById(id) {
    const [rows] = await pool.query(`${LIST} WHERE t.id = ? LIMIT 1`, [id]);
    return rows[0] || null;
  },

  async messages(ticketId) {
    const [rows] = await pool.query(
      `SELECT id, sender_type AS senderType, sender_name AS senderName, body, created_at AS createdAt
       FROM agent_ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC, id ASC`,
      [ticketId],
    );
    return rows;
  },

  async addMessage(ticketId, { senderType, senderName, body }) {
    await pool.query(
      `INSERT INTO agent_ticket_messages (ticket_id, sender_type, sender_name, body) VALUES (?, ?, ?, ?)`,
      [ticketId, senderType, senderName || null, body],
    );
    // admin reply moves an open ticket to in_progress
    const bump = senderType === 'admin'
      ? `, status = IF(status = 'open', 'in_progress', status)`
      : '';
    await pool.query(`UPDATE agent_tickets SET last_message_at = NOW()${bump} WHERE id = ?`, [ticketId]);
  },

  async setStatus(id, status) {
    const [r] = await pool.query(`UPDATE agent_tickets SET status = ? WHERE id = ?`, [status, id]);
    return r.affectedRows > 0;
  },

  async stats() {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total, SUM(status = 'open') AS open, SUM(status = 'in_progress') AS inProgress FROM agent_tickets`,
    );
    const s = rows[0] || {};
    return { total: Number(s.total || 0), open: Number(s.open || 0), inProgress: Number(s.inProgress || 0) };
  },
};

module.exports = AgentTicketModel;
