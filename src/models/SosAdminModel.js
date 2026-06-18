const { pool } = require('../config/db');

// Admin-managed SOS dispatch number + emergency services, plus live alert feed.
const SosAdminModel = {
  // ---- config (single SOS dispatch number) ----
  async getSosPhone() {
    const [[row]] = await pool.query('SELECT sos_phone AS sosPhone FROM sos_config WHERE id = 1 LIMIT 1');
    return row ? row.sosPhone : null;
  },
  async setSosPhone(phone) {
    await pool.query(
      `INSERT INTO sos_config (id, sos_phone) VALUES (1, ?)
       ON DUPLICATE KEY UPDATE sos_phone = VALUES(sos_phone)`, [phone || null],
    );
    return this.getSosPhone();
  },

  // ---- emergency services (list shown to all residents) ----
  async listServices() {
    const [rows] = await pool.query(
      'SELECT id, name, phone, sort_order AS sortOrder FROM emergency_services ORDER BY sort_order ASC, id ASC',
    );
    return rows;
  },
  async addService(d) {
    const [[mx]] = await pool.query('SELECT COALESCE(MAX(sort_order),-1)+1 AS next FROM emergency_services');
    const [r] = await pool.query(
      'INSERT INTO emergency_services (name, phone, sort_order) VALUES (?, ?, ?)',
      [d.name, d.phone, mx.next],
    );
    return r.insertId;
  },
  async updateService(id, d) {
    const [r] = await pool.query(
      'UPDATE emergency_services SET name = COALESCE(?, name), phone = COALESCE(?, phone) WHERE id = ?',
      [d.name ?? null, d.phone ?? null, id],
    );
    return r.affectedRows > 0;
  },
  async deleteService(id) {
    const [r] = await pool.query('DELETE FROM emergency_services WHERE id = ?', [id]);
    return r.affectedRows > 0;
  },

  async getPublicConfig() {
    const [sosPhone, services] = await Promise.all([this.getSosPhone(), this.listServices()]);
    return { sosPhone, services };
  },

  // ---- live alerts ----
  // Create an active SOS alert for a resident.
  async createAlert(userId, { lat, lng, notes } = {}) {
    const [r] = await pool.query(
      `INSERT INTO sos_requests (user_id, lat, lng, status, notes) VALUES (?, ?, ?, 'active', ?)`,
      [userId, lat ?? null, lng ?? null, notes || null],
    );
    return r.insertId;
  },

  // Active alerts + the resident's details (name, phone, flat/tower/floor) for
  // the reception danger popup. First property is used for unit details.
  async activeAlerts() {
    const [rows] = await pool.query(
      `SELECT s.id, s.created_at AS createdAt, s.notes, s.lat, s.lng,
              u.id AS userId, u.name AS name, u.mobile AS phone,
              up.flat_no AS flatNo, up.tower, up.floor, up.project_name AS projectName,
              up.address_line AS addressLine, up.city
       FROM sos_requests s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN user_properties up
              ON up.id = (SELECT id FROM user_properties p WHERE p.user_id = u.id ORDER BY id ASC LIMIT 1)
       WHERE s.status = 'active'
       ORDER BY s.created_at ASC`,
    );
    return rows;
  },

  async acknowledge(id) {
    const [r] = await pool.query(
      `UPDATE sos_requests SET status = 'resolved', ack_at = NOW() WHERE id = ? AND status = 'active'`, [id],
    );
    return r.affectedRows > 0;
  },

  async activeCount() {
    const [[row]] = await pool.query(`SELECT COUNT(*) AS n FROM sos_requests WHERE status = 'active'`);
    return row.n;
  },
};

module.exports = SosAdminModel;
