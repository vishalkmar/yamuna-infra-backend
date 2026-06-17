const { pool } = require('../config/db');
const { availableSlots } = require('../utils/wellness');

const WellnessModel = {
  async listTherapies() {
    const [rows] = await pool.query(
      `SELECT t.id, t.code, t.name, t.icon, t.image_url AS imageUrl, t.description, t.price,
              t.duration_min AS durationMin, t.category_id AS categoryId, c.name AS categoryName,
              t.is_package AS isPackage, t.package_days AS packageDays
       FROM wellness_therapies t LEFT JOIN wellness_categories c ON c.id = t.category_id
       WHERE t.active = 1 ORDER BY t.sort_order ASC, t.id ASC`,
    );
    return rows.map(r => ({ ...r, isPackage: !!r.isPackage }));
  },

  // Active wellness categories (Task 2) — for the app's category → activity view.
  async listCategories() {
    const [rows] = await pool.query(
      `SELECT id, code, name, icon, image_url AS imageUrl
       FROM wellness_categories WHERE is_active = 1 ORDER BY sort_order ASC, id ASC`,
    );
    return rows;
  },

  // Spiritual concierge catalog (Module A8) — admin-managed puja/seva services.
  async listSpiritualServices() {
    const [rows] = await pool.query(
      `SELECT id, name, icon, image_url AS imageUrl, price, notes
       FROM spiritual_services WHERE is_active = 1 ORDER BY sort_order ASC, id ASC`,
    );
    return rows;
  },

  async getTherapy(therapyId) {
    const [rows] = await pool.query(
      `SELECT id, name, is_package AS isPackage, package_days AS packageDays
       FROM wellness_therapies WHERE id = ? AND active = 1 LIMIT 1`,
      [therapyId],
    );
    const r = rows[0];
    if (!r) return null;
    return { ...r, isPackage: !!r.isPackage };
  },

  async getSlots(date) {
    const [rows] = await pool.query(
      `SELECT time_slot AS slot FROM wellness_bookings
       WHERE visit_date = ? AND status = 'booked'`,
      [date],
    );
    return availableSlots(rows.map(r => r.slot).filter(Boolean));
  },

  async book(b) {
    const [r] = await pool.query(
      `INSERT INTO wellness_bookings
        (user_id, therapy_id, duration_min, therapist_gender, visit_date, time_slot, health_note, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'booked')`,
      [b.userId, b.therapyId, b.durationMin, b.therapistGender || 'any', b.date, b.timeSlot, b.healthNote || null],
    );
    return { id: r.insertId, date: b.date, timeSlot: b.timeSlot };
  },

  async listBookings(userId) {
    const [rows] = await pool.query(
      `SELECT wb.id, wb.duration_min AS durationMin, wb.therapist_gender AS therapistGender,
              wb.visit_date AS visitDate, wb.time_slot AS timeSlot, wb.health_note AS healthNote,
              wb.status, wb.created_at AS createdAt,
              t.name AS therapyName, t.icon, t.is_package AS isPackage, t.package_days AS packageDays
       FROM wellness_bookings wb
       JOIN wellness_therapies t ON t.id = wb.therapy_id
       WHERE wb.user_id = ?
       ORDER BY wb.visit_date DESC, wb.id DESC`,
      [userId],
    );
    return rows.map(r => ({ ...r, isPackage: !!r.isPackage }));
  },
};

module.exports = WellnessModel;
