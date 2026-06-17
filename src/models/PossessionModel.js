const { pool } = require('../config/db');

const PossessionModel = {
  async getChecklist(bookingCode) {
    const [rows] = await pool.query(
      `SELECT c.id, c.step, c.category, c.completed, c.sort_order AS sortOrder,
              c.updated_at AS updatedAt
       FROM possession_checklists c
       JOIN bookings b ON b.id = c.booking_id
       WHERE b.booking_code = ?
       ORDER BY c.sort_order ASC, c.id ASC`,
      [bookingCode],
    );
    return rows.map(r => ({ ...r, completed: !!r.completed }));
  },

  async getDocuments(bookingCode) {
    const [rows] = await pool.query(
      `SELECT d.id, d.name, d.kind, d.url, d.available
       FROM possession_documents d
       JOIN bookings b ON b.id = d.booking_id
       WHERE b.booking_code = ?
       ORDER BY d.id ASC`,
      [bookingCode],
    );
    return rows.map(r => ({ ...r, available: !!r.available }));
  },

  async getBookingStatus(bookingCode) {
    const [rows] = await pool.query(
      `SELECT status FROM bookings WHERE booking_code = ? LIMIT 1`,
      [bookingCode],
    );
    return rows[0]?.status || null;
  },

  async getUpcomingAppointment(bookingCode) {
    const [rows] = await pool.query(
      `SELECT a.id, a.appointment_date AS appointmentDate, a.time_slot AS timeSlot,
              a.attendees, a.special_request AS specialRequest, a.status
       FROM possession_appointments a
       JOIN bookings b ON b.id = a.booking_id
       WHERE b.booking_code = ? AND a.status = 'scheduled' AND a.appointment_date >= CURDATE()
       ORDER BY a.appointment_date ASC, a.id ASC
       LIMIT 1`,
      [bookingCode],
    );
    return rows[0] || null;
  },

  async bookAppointment({ bookingCode, appointmentDate, timeSlot, attendees, specialRequest }) {
    const [b] = await pool.query(`SELECT id FROM bookings WHERE booking_code = ? LIMIT 1`, [bookingCode]);
    const bookingPk = b[0]?.id;
    if (!bookingPk) return null;

    const [r] = await pool.query(
      `INSERT INTO possession_appointments
         (booking_id, appointment_date, time_slot, attendees, special_request)
       VALUES (?, ?, ?, ?, ?)`,
      [bookingPk, appointmentDate, timeSlot, attendees, specialRequest || null],
    );
    return { id: r.insertId, appointmentDate, timeSlot, attendees, status: 'scheduled' };
  },
};

module.exports = PossessionModel;
