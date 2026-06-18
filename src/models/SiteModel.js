const { pool } = require('../config/db');

const SiteModel = {
  async getConfig() {
    const [[row]] = await pool.query(
      `SELECT title, address, map_url AS mapUrl, progress_percent AS progressPercent,
              progress_note AS progressNote, updated_at AS updatedAt
       FROM site_overview WHERE id = 1 LIMIT 1`,
    );
    return row || { title: null, address: null, mapUrl: null, progressPercent: 0, progressNote: null };
  },

  async setConfig(d) {
    await pool.query(
      `INSERT INTO site_overview (id, title, address, map_url, progress_percent, progress_note)
       VALUES (1, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE title=VALUES(title), address=VALUES(address), map_url=VALUES(map_url),
         progress_percent=VALUES(progress_percent), progress_note=VALUES(progress_note)`,
      [d.title || null, d.address || null, d.mapUrl || null,
       d.progressPercent != null ? Number(d.progressPercent) : 0, d.progressNote || null],
    );
    return this.getConfig();
  },

  async listImages() {
    const [rows] = await pool.query(
      'SELECT id, url, caption, sort_order AS sortOrder FROM site_images ORDER BY sort_order ASC, id ASC',
    );
    return rows;
  },
  async addImage(d) {
    const [[mx]] = await pool.query('SELECT COALESCE(MAX(sort_order),-1)+1 AS next FROM site_images');
    const [r] = await pool.query('INSERT INTO site_images (url, caption, sort_order) VALUES (?, ?, ?)', [d.url, d.caption || null, mx.next]);
    return r.insertId;
  },
  async deleteImage(id) {
    const [r] = await pool.query('DELETE FROM site_images WHERE id = ?', [id]);
    return r.affectedRows > 0;
  },

  async listUpdates(limit = 50) {
    const [rows] = await pool.query(
      'SELECT id, title, description, media_url AS mediaUrl, posted_at AS postedAt FROM site_updates ORDER BY posted_at DESC, id DESC LIMIT ?',
      [Number(limit) || 50],
    );
    return rows;
  },
  async addUpdate(d) {
    const [r] = await pool.query(
      'INSERT INTO site_updates (title, description, media_url) VALUES (?, ?, ?)',
      [d.title, d.description || null, d.mediaUrl || null],
    );
    return r.insertId;
  },
  async deleteUpdate(id) {
    const [r] = await pool.query('DELETE FROM site_updates WHERE id = ?', [id]);
    return r.affectedRows > 0;
  },

  async getOverview() {
    const [config, images, updates] = await Promise.all([this.getConfig(), this.listImages(), this.listUpdates()]);
    return { config, images, updates };
  },
};

module.exports = SiteModel;
