const { pool } = require('../config/db');
const { makeQrToken, makeBookingCode, availableSlots } = require('../utils/community');

const CommunityModel = {
  // ---- Feed ----
  async listAnnouncements() {
    const [rows] = await pool.query(
      `SELECT id, title, body, image_url AS imageUrl, category, pinned, posted_at AS postedAt
       FROM community_announcements
       WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY pinned DESC, posted_at DESC, id DESC`,
    );
    return rows.map(r => ({ ...r, pinned: !!r.pinned }));
  },

  async listEvents() {
    const [rows] = await pool.query(
      `SELECT id, title, image_url AS imageUrl, description, event_date AS eventDate, location
       FROM community_events WHERE active = 1 ORDER BY sort_order ASC, event_date ASC`,
    );
    return rows;
  },

  // ---- Visitor management ----
  async preAuthorize(v) {
    const token = makeQrToken();
    const [r] = await pool.query(
      `INSERT INTO visitor_passes
        (user_id, guest_name, guest_phone, visit_date, visit_purpose, valid_till, vehicle_no, qr_token, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [v.userId, v.guestName, v.guestPhone, v.visitDate, v.visitPurpose, v.validTill || null, v.vehicleNo || null, token],
    );
    return { id: r.insertId, qrToken: token, guestName: v.guestName };
  },

  async visitorHistory(userId) {
    const [rows] = await pool.query(
      `SELECT id, guest_name AS guestName, guest_phone AS guestPhone, visit_date AS visitDate,
              visit_purpose AS visitPurpose, valid_till AS validTill, vehicle_no AS vehicleNo,
              qr_token AS qrToken, status, created_at AS createdAt
       FROM visitor_passes WHERE user_id = ?
       ORDER BY visit_date DESC, id DESC`,
      [userId],
    );
    return rows;
  },

  // ---- Amenities ----
  async listAmenities() {
    const [rows] = await pool.query(
      `SELECT id, code, name, icon, image_url AS imageUrl, capacity, deposit,
              hourly_rate AS hourlyRate, location, features
       FROM amenities WHERE active = 1 ORDER BY sort_order ASC, id ASC`,
    );
    return rows;
  },

  async getAmenity(amenityId) {
    const [rows] = await pool.query(
      `SELECT id, code, name, icon, image_url AS imageUrl, capacity, deposit,
              hourly_rate AS hourlyRate, location, features, description,
              open_time AS openTime, close_time AS closeTime, slot_minutes AS slotMinutes
       FROM amenities WHERE id = ? AND active = 1 LIMIT 1`,
      [amenityId],
    );
    return rows[0] || null;
  },

  async isBlackedOut(amenityId, date) {
    const [rows] = await pool.query(
      `SELECT 1 FROM amenity_blackouts WHERE amenity_id = ? AND blackout_date = ? LIMIT 1`,
      [amenityId, date],
    );
    return rows.length > 0;
  },

  async getAmenitySlots(amenityId, date) {
    const [rows] = await pool.query(
      `SELECT time_slot AS slot FROM amenity_bookings
       WHERE amenity_id = ? AND booking_date = ? AND status = 'booked'`,
      [amenityId, date],
    );
    return availableSlots(rows.map(r => r.slot).filter(Boolean));
  },

  async bookAmenity(b) {
    const code = makeBookingCode();
    const [r] = await pool.query(
      `INSERT INTO amenity_bookings
        (booking_code, user_id, amenity_id, booking_date, time_slot, occasion, extra_services, guest_count, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'booked')`,
      [code, b.userId, b.amenityId, b.bookingDate, b.timeSlot, b.occasion || null,
        (b.extraServices || []).join(',') || null, b.guestCount],
    );
    return { id: r.insertId, bookingCode: code };
  },

  async listMyAmenityBookings(userId) {
    const [rows] = await pool.query(
      `SELECT ab.id, ab.booking_code AS bookingCode, ab.booking_date AS bookingDate,
              ab.time_slot AS timeSlot, ab.occasion, ab.extra_services AS extraServices,
              ab.guest_count AS guestCount, ab.status, a.name AS amenityName, a.icon
       FROM amenity_bookings ab
       JOIN amenities a ON a.id = ab.amenity_id
       WHERE ab.user_id = ?
       ORDER BY ab.booking_date DESC, ab.id DESC`,
      [userId],
    );
    return rows.map(r => ({ ...r, extraServices: r.extraServices ? r.extraServices.split(',') : [] }));
  },
};

module.exports = CommunityModel;
