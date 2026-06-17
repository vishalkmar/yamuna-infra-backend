const { pool } = require('../config/db');

const AdminSettingsModel = {
  // ---------- Settings (key/value) ----------
  async getAll() {
    const [rows] = await pool.query(`SELECT skey, svalue FROM app_settings`);
    const out = {};
    for (const r of rows) out[r.skey] = r.svalue;
    return out;
  },

  async setMany(obj) {
    const entries = Object.entries(obj || {});
    for (const [skey, svalue] of entries) {
      await pool.query(
        `INSERT INTO app_settings (skey, svalue) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE svalue = VALUES(svalue)`,
        [skey, svalue == null ? null : String(svalue)],
      );
    }
    return this.getAll();
  },

  // ---------- Daily content ----------
  async listDaily() {
    const [rows] = await pool.query(
      `SELECT id, kind, text, author, is_active AS isActive, sort_order AS sortOrder
       FROM daily_content ORDER BY sort_order ASC, id ASC`,
    );
    return rows;
  },

  async createDaily(d) {
    const [r] = await pool.query(
      `INSERT INTO daily_content (kind, text, author, is_active, sort_order) VALUES (?, ?, ?, ?, ?)`,
      [d.kind || 'quote', d.text, d.author || null, d.isActive ? 1 : 0, d.sortOrder || 0],
    );
    return { id: r.insertId };
  },

  async updateDaily(id, d) {
    const [r] = await pool.query(
      `UPDATE daily_content SET kind = ?, text = ?, author = ?, is_active = ?, sort_order = ? WHERE id = ?`,
      [d.kind || 'quote', d.text, d.author || null, d.isActive ? 1 : 0, d.sortOrder || 0, id],
    );
    return r.affectedRows > 0;
  },

  async deleteDaily(id) {
    const [r] = await pool.query(`DELETE FROM daily_content WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  },

  // ---------- Reminder categories ----------
  async listReminderCategories() {
    const [rows] = await pool.query(
      `SELECT id, code, name, icon, is_active AS isActive, sort_order AS sortOrder
       FROM reminder_categories ORDER BY sort_order ASC, id ASC`,
    );
    return rows;
  },

  async createReminderCategory(d) {
    const [r] = await pool.query(
      `INSERT INTO reminder_categories (code, name, icon, is_active, sort_order) VALUES (?, ?, ?, ?, ?)`,
      [d.code, d.name, d.icon || null, d.isActive ? 1 : 0, d.sortOrder || 0],
    );
    return { id: r.insertId };
  },

  async updateReminderCategory(id, d) {
    const [r] = await pool.query(
      `UPDATE reminder_categories SET name = ?, icon = ?, is_active = ?, sort_order = ? WHERE id = ?`,
      [d.name, d.icon || null, d.isActive ? 1 : 0, d.sortOrder || 0, id],
    );
    return r.affectedRows > 0;
  },

  async deleteReminderCategory(id) {
    const [r] = await pool.query(`DELETE FROM reminder_categories WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  },

  // ---------- Public bundle (for the resident app) ----------
  async publicBundle() {
    const settings = await this.getAll();
    let flags = {};
    try { flags = JSON.parse(settings.feature_flags || '{}'); } catch { flags = {}; }
    const [daily] = await pool.query(
      `SELECT kind, text, author FROM daily_content WHERE is_active = 1 ORDER BY sort_order ASC, id ASC`,
    );
    const [cats] = await pool.query(
      `SELECT code, name, icon FROM reminder_categories WHERE is_active = 1 ORDER BY sort_order ASC, id ASC`,
    );
    return {
      flags,
      pages: { terms: settings.page_terms || '', privacy: settings.page_privacy || '', about: settings.page_about || '' },
      dailyContent: daily,
      reminderCategories: cats,
    };
  },
};

module.exports = AdminSettingsModel;
