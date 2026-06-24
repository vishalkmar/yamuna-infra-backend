const { pool } = require('../config/db');

// Lead documents (Module 2.8). Shared by agent + admin sides.
const LeadDocModel = {
  async list(leadId) {
    const [rows] = await pool.query(
      `SELECT id, lead_id AS leadId, label, url, by_type AS byType, by_name AS byName, created_at AS createdAt
       FROM lead_documents WHERE lead_id = ? ORDER BY created_at DESC, id DESC`,
      [leadId],
    );
    return rows;
  },

  async getById(id) {
    const [rows] = await pool.query(`SELECT id, lead_id AS leadId FROM lead_documents WHERE id = ? LIMIT 1`, [id]);
    return rows[0] || null;
  },

  async create({ leadId, label, url, byType, byName }) {
    const [r] = await pool.query(
      `INSERT INTO lead_documents (lead_id, label, url, by_type, by_name) VALUES (?, ?, ?, ?, ?)`,
      [leadId, label || null, url, byType, byName || null],
    );
    return { id: r.insertId };
  },

  async remove(id) {
    const [r] = await pool.query(`DELETE FROM lead_documents WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  },
};

module.exports = LeadDocModel;
