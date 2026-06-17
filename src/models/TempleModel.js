const { pool } = require('../config/db');
const { makeDarshanCode } = require('../utils/darshan');

const TempleModel = {
  async listTemples() {
    const [rows] = await pool.query(
      `SELECT id, name, city, rating, crowd_status AS crowdStatus, distance_km AS distanceKm,
              image_url AS imageUrl, vip_available AS vipAvailable, featured
       FROM temples WHERE active = 1
       ORDER BY featured DESC, sort_order ASC, rating DESC, id ASC`,
    );
    return rows.map(r => ({ ...r, vipAvailable: !!r.vipAvailable }));
  },

  async getTemple(templeId) {
    const [rows] = await pool.query(
      `SELECT id, name, city, rating, crowd_status AS crowdStatus, distance_km AS distanceKm,
              image_url AS imageUrl, aarti_times AS aartiTimes, maps_url AS mapsUrl,
              donation_url AS donationUrl, vip_available AS vipAvailable, description
       FROM temples WHERE id = ? AND active = 1 LIMIT 1`,
      [templeId],
    );
    const t = rows[0];
    if (!t) return null;
    const [festivals] = await pool.query(
      `SELECT id, name, festival_date AS festivalDate, significance
       FROM temple_festivals
       WHERE active = 1 AND (temple_id = ? OR temple_id IS NULL)
       ORDER BY festival_date ASC`,
      [templeId],
    );
    return { ...t, vipAvailable: !!t.vipAvailable, festivals };
  },

  async listFestivals() {
    const [rows] = await pool.query(
      `SELECT id, temple_id AS templeId, name, festival_date AS festivalDate, significance
       FROM temple_festivals WHERE active = 1 ORDER BY festival_date ASC`,
    );
    return rows;
  },

  async bookDarshan(b) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const code = makeDarshanCode();
      const [r] = await conn.query(
        `INSERT INTO darshan_bookings
          (booking_code, user_id, visit_date, visit_time_slot, transport_type, persons,
           senior_citizens, group_name, special_puja, is_vip, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'booked')`,
        [code, b.userId, b.visitDate, b.visitTimeSlot, b.transportType, b.persons,
          b.seniorCitizens || 0, b.groupName || null, b.specialPuja || null, b.isVip ? 1 : 0],
      );
      const bookingId = r.insertId;
      for (const templeId of b.templeIds) {
        await conn.query(
          `INSERT INTO darshan_booking_temples (booking_id, temple_id) VALUES (?, ?)`,
          [bookingId, templeId],
        );
      }
      await conn.commit();
      return { id: bookingId, bookingCode: code, isVip: !!b.isVip };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  },

  async listMyDarshan(userId) {
    const [rows] = await pool.query(
      `SELECT db.id, db.booking_code AS bookingCode, db.visit_date AS visitDate,
              db.visit_time_slot AS visitTimeSlot, db.transport_type AS transportType,
              db.persons, db.senior_citizens AS seniorCitizens, db.group_name AS groupName,
              db.special_puja AS specialPuja, db.is_vip AS isVip, db.status, db.created_at AS createdAt,
              GROUP_CONCAT(t.name SEPARATOR ', ') AS temples
       FROM darshan_bookings db
       LEFT JOIN darshan_booking_temples dt ON dt.booking_id = db.id
       LEFT JOIN temples t ON t.id = dt.temple_id
       WHERE db.user_id = ?
       GROUP BY db.id
       ORDER BY db.visit_date DESC, db.id DESC`,
      [userId],
    );
    return rows.map(r => ({ ...r, isVip: !!r.isVip }));
  },
};

module.exports = TempleModel;
