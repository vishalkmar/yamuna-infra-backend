const { pool } = require('../config/db');

const COLS = `id, channel, title, subject, body, is_active AS isActive, sort_order AS sortOrder`;

const LeadTemplateModel = {
  async adminList() {
    const [rows] = await pool.query(`SELECT ${COLS} FROM lead_message_templates ORDER BY channel, sort_order ASC, id DESC`);
    return rows;
  },

  async listActive(channel) {
    const where = ['is_active = 1'];
    const params = [];
    if (channel) { where.push('channel = ?'); params.push(channel); }
    const [rows] = await pool.query(`SELECT ${COLS} FROM lead_message_templates WHERE ${where.join(' AND ')} ORDER BY channel, sort_order ASC, id DESC`, params);
    return rows;
  },

  async create(d) {
    const [r] = await pool.query(
      `INSERT INTO lead_message_templates (channel, title, subject, body, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
      [d.channel || 'whatsapp', d.title, d.subject || null, d.body, d.isActive ? 1 : 0, d.sortOrder || 0],
    );
    return { id: r.insertId };
  },

  async update(id, d) {
    const [r] = await pool.query(
      `UPDATE lead_message_templates SET channel = ?, title = ?, subject = ?, body = ?, is_active = ?, sort_order = ? WHERE id = ?`,
      [d.channel || 'whatsapp', d.title, d.subject || null, d.body, d.isActive ? 1 : 0, d.sortOrder || 0, id],
    );
    return r.affectedRows > 0;
  },

  async remove(id) {
    const [r] = await pool.query(`DELETE FROM lead_message_templates WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  },
};

module.exports = LeadTemplateModel;
