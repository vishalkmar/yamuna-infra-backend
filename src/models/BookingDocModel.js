const { pool } = require('../config/db');

// Booking documents (Module 3.5). Shared by agent + admin sides.
const BookingDocModel = {
  async list(bookingId) {
    const [rows] = await pool.query(
      `SELECT id, booking_id AS bookingId, doc_type AS docType, label, url,
              by_type AS byType, by_name AS byName, created_at AS createdAt
       FROM agent_booking_documents WHERE booking_id = ? ORDER BY created_at DESC, id DESC`,
      [bookingId],
    );
    return rows;
  },

  async getById(id) {
    const [rows] = await pool.query(`SELECT id, booking_id AS bookingId FROM agent_booking_documents WHERE id = ? LIMIT 1`, [id]);
    return rows[0] || null;
  },

  async create({ bookingId, docType, label, url, byType, byName }) {
    const [r] = await pool.query(
      `INSERT INTO agent_booking_documents (booking_id, doc_type, label, url, by_type, by_name)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [bookingId, docType || 'other', label || null, url, byType, byName || null],
    );
    return { id: r.insertId };
  },

  async remove(id) {
    const [r] = await pool.query(`DELETE FROM agent_booking_documents WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  },
};

module.exports = BookingDocModel;
