const { pool } = require('../config/db');
const { makeRequestCode, etaMinutes } = require('../utils/sos');

const SosModel = {
  // Replace the user's emergency contacts + upsert medical profile in one txn.
  async saveContactsAndProfile({ userId, contacts, bloodGroup, medicalNotes }) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(`DELETE FROM emergency_contacts WHERE user_id = ?`, [userId]);
      for (let i = 0; i < contacts.length; i++) {
        const c = contacts[i];
        await conn.query(
          `INSERT INTO emergency_contacts (user_id, name, phone, relation, is_primary)
           VALUES (?, ?, ?, ?, ?)`,
          [userId, c.name.trim(), c.phone, c.relation, i === 0 ? 1 : 0],
        );
      }

      await conn.query(
        `INSERT INTO medical_profiles (user_id, blood_group, medical_notes)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE blood_group = VALUES(blood_group), medical_notes = VALUES(medical_notes)`,
        [userId, bloodGroup || null, medicalNotes || null],
      );

      await conn.commit();
      return { count: contacts.length };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  },

  async getContacts(userId) {
    const [rows] = await pool.query(
      `SELECT id, name, phone, relation, is_primary AS isPrimary
       FROM emergency_contacts WHERE user_id = ? ORDER BY is_primary DESC, id ASC`,
      [userId],
    );
    return rows.map(r => ({ ...r, isPrimary: !!r.isPrimary }));
  },

  async getProfile(userId) {
    const [rows] = await pool.query(
      `SELECT blood_group AS bloodGroup, medical_notes AS medicalNotes
       FROM medical_profiles WHERE user_id = ? LIMIT 1`,
      [userId],
    );
    return rows[0] || { bloodGroup: null, medicalNotes: null };
  },

  async activate({ userId, lat, lng, notes }) {
    const code = makeRequestCode();
    const eta = etaMinutes();
    const [r] = await pool.query(
      `INSERT INTO sos_requests (request_code, user_id, lat, lng, status, eta_minutes, ambulance_label, notes)
       VALUES (?, ?, ?, ?, 'dispatched', ?, ?, ?)`,
      [code, userId, lat ?? null, lng ?? null, eta, 'Ambulance VRN-07', notes || null],
    );
    return { id: r.insertId, requestCode: code, etaMinutes: eta, ambulanceLabel: 'Ambulance VRN-07', status: 'dispatched' };
  },

  async track(requestId, userId) {
    const [rows] = await pool.query(
      `SELECT id, request_code AS requestCode, status, eta_minutes AS etaMinutes,
              ambulance_label AS ambulanceLabel, lat, lng, user_id AS userId
       FROM sos_requests WHERE id = ? LIMIT 1`,
      [requestId],
    );
    const row = rows[0];
    if (!row) return null;
    if (userId && row.userId !== userId) return { _forbidden: true };
    return row;
  },
};

module.exports = SosModel;
