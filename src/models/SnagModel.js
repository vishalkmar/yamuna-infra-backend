const { pool } = require('../config/db');
const { makeSnagCode } = require('../utils/snag');

const SnagModel = {
  async report({ bookingCode, location, defectType, description, severity, photos }) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [b] = await conn.query(`SELECT id FROM bookings WHERE booking_code = ? LIMIT 1`, [bookingCode]);
      const bookingPk = b[0]?.id;
      if (!bookingPk) { await conn.rollback(); return null; }

      // Insert with a placeholder code, then derive a stable code from the id.
      const [r] = await conn.query(
        `INSERT INTO snags (booking_id, snag_code, location, defect_type, description, severity, status)
         VALUES (?, ?, ?, ?, ?, ?, 'open')`,
        [bookingPk, `TMP-${Date.now()}`, location, defectType, description, severity],
      );
      const snagId = r.insertId;
      const code = makeSnagCode(snagId);
      await conn.query(`UPDATE snags SET snag_code = ? WHERE id = ?`, [code, snagId]);

      const urls = Array.isArray(photos) ? photos.slice(0, 5) : [];
      for (const url of urls) {
        await conn.query(`INSERT INTO snag_photos (snag_id, url) VALUES (?, ?)`, [snagId, url]);
      }

      await conn.commit();
      return { id: snagId, snagCode: code };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  },

  async listForBooking(bookingCode, { status } = {}) {
    const where = ['b.booking_code = ?'];
    const params = [bookingCode];
    if (status) {
      where.push('s.status = ?');
      params.push(status);
    }
    const [rows] = await pool.query(
      `SELECT s.id, s.snag_code AS snagCode, s.location, s.defect_type AS defectType,
              s.description, s.severity, s.status,
              s.resolved_at AS resolvedAt, s.signed_off_at AS signedOffAt, s.created_at AS createdAt,
              GROUP_CONCAT(p.url SEPARATOR '||') AS photoUrls
       FROM snags s
       JOIN bookings b ON b.id = s.booking_id
       LEFT JOIN snag_photos p ON p.snag_id = s.id
       WHERE ${where.join(' AND ')}
       GROUP BY s.id
       ORDER BY FIELD(s.severity, 'critical', 'major', 'minor'), s.created_at DESC`,
      params,
    );
    return rows.map(r => ({
      ...r,
      photos: r.photoUrls ? r.photoUrls.split('||') : [],
      photoUrls: undefined,
    }));
  },

  async findSnag(snagId) {
    const [rows] = await pool.query(
      `SELECT s.id, s.snag_code AS snagCode, s.status, b.booking_code AS bookingCode
       FROM snags s JOIN bookings b ON b.id = s.booking_id
       WHERE s.id = ? LIMIT 1`,
      [snagId],
    );
    return rows[0] || null;
  },

  async signoff(snagId) {
    const [r] = await pool.query(
      `UPDATE snags SET status = 'signed_off', signed_off_at = NOW()
       WHERE id = ? AND status = 'resolved'`,
      [snagId],
    );
    return r.affectedRows > 0;
  },
};

module.exports = SnagModel;
