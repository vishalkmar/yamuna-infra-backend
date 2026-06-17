const { pool } = require('../config/db');
const { makeTicketCode, clampAttachments } = require('../utils/support');

const SupportModel = {
  // ------------------------------------------------------------
  // Create
  // ------------------------------------------------------------
  async createTicket(t) {
    const code = makeTicketCode();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [r] = await conn.query(
        `INSERT INTO support_tickets
          (user_id, booking_id, ticket_code, category, subject, description,
           priority, status, last_message_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'open', NOW())`,
        [t.userId, t.bookingId || null, code, t.category, t.subject, t.description, t.priority || 'normal'],
      );
      const ticketId = r.insertId;

      // First message is the description itself, authored by the user.
      await conn.query(
        `INSERT INTO ticket_messages (ticket_id, author, body) VALUES (?, 'user', ?)`,
        [ticketId, t.description],
      );

      for (const a of clampAttachments(t.attachments)) {
        await conn.query(
          `INSERT INTO ticket_attachments (ticket_id, url, kind, file_size) VALUES (?, ?, ?, ?)`,
          [ticketId, a.url, a.kind, a.fileSize],
        );
      }

      await conn.commit();
      return { id: ticketId, ticketCode: code };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  },

  // ------------------------------------------------------------
  // Lists
  // ------------------------------------------------------------
  async listForUser(userId, { status } = {}) {
    const where = ['t.user_id = ?'];
    const params = [userId];
    if (status) {
      where.push('t.status = ?');
      params.push(status);
    }
    const [rows] = await pool.query(
      `SELECT t.id, t.ticket_code AS ticketCode, t.category, t.subject,
              t.priority, t.status, t.assigned_agent AS assignedAgent,
              t.created_at AS createdAt, t.last_message_at AS lastMessageAt,
              t.rating,
              (SELECT m.body FROM ticket_messages m
               WHERE m.ticket_id = t.id ORDER BY m.id DESC LIMIT 1) AS lastMessage
       FROM support_tickets t
       WHERE ${where.join(' AND ')}
       ORDER BY t.last_message_at DESC, t.id DESC`,
      params,
    );
    return rows;
  },

  async findTicket(ticketId, userId) {
    const [rows] = await pool.query(
      `SELECT t.id, t.user_id AS userId, t.ticket_code AS ticketCode, t.category,
              t.subject, t.description, t.priority, t.status,
              t.assigned_agent AS assignedAgent, t.rating,
              t.created_at AS createdAt, t.last_message_at AS lastMessageAt,
              t.resolved_at AS resolvedAt
       FROM support_tickets t
       WHERE t.id = ? LIMIT 1`,
      [ticketId],
    );
    const row = rows[0];
    if (!row) return null;
    if (userId && row.userId !== userId) return { _forbidden: true };
    return row;
  },

  async getThread(ticketId) {
    const [messages] = await pool.query(
      `SELECT id, author, body, created_at AS createdAt
       FROM ticket_messages WHERE ticket_id = ? ORDER BY id ASC`,
      [ticketId],
    );
    const [attachments] = await pool.query(
      `SELECT id, url, kind, file_size AS fileSize
       FROM ticket_attachments WHERE ticket_id = ? ORDER BY id ASC`,
      [ticketId],
    );
    return { messages, attachments };
  },

  // ------------------------------------------------------------
  // Mutations
  // ------------------------------------------------------------
  async addReply(ticketId, author, body) {
    const [r] = await pool.query(
      `INSERT INTO ticket_messages (ticket_id, author, body) VALUES (?, ?, ?)`,
      [ticketId, author, body],
    );
    // A fresh user reply re-opens a resolved ticket into in_progress.
    await pool.query(
      `UPDATE support_tickets
       SET last_message_at = NOW(),
           status = CASE WHEN status IN ('open','resolved','closed') THEN 'in_progress' ELSE status END
       WHERE id = ?`,
      [ticketId],
    );
    return { id: r.insertId, author, body };
  },

  async rate(ticketId, rating) {
    await pool.query(
      `UPDATE support_tickets SET rating = ? WHERE id = ?`,
      [rating, ticketId],
    );
  },

  async bookAppointment({ ticketId, userId, agentName, scheduledAt, mode }) {
    const [r] = await pool.query(
      `INSERT INTO support_appointments (ticket_id, user_id, agent_name, scheduled_at, mode)
       VALUES (?, ?, ?, ?, ?)`,
      [ticketId || null, userId, agentName, scheduledAt, mode === 'video' ? 'video' : 'call'],
    );
    return { id: r.insertId, agentName, scheduledAt, mode: mode === 'video' ? 'video' : 'call' };
  },
};

module.exports = SupportModel;
