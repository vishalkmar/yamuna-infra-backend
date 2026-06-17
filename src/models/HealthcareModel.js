const { pool } = require('../config/db');
const { makeAppointmentCode, availableSlots } = require('../utils/healthcare');

const HealthcareModel = {
  async listDoctors({ specialty } = {}) {
    const where = ['active = 1'];
    const params = [];
    if (specialty) { where.push('specialty = ?'); params.push(specialty); }
    const [rows] = await pool.query(
      `SELECT id, name, image_url AS imageUrl, specialty, qualifications, description,
              experience_years AS experienceYears, fee, languages, rating, phone,
              available_days AS availableDays, slots
       FROM doctors WHERE ${where.join(' AND ')}
       ORDER BY sort_order ASC, rating DESC, id ASC`,
      params,
    );
    return rows;
  },

  async getSlots(doctorId, date) {
    const [rows] = await pool.query(
      `SELECT time_slot AS slot FROM healthcare_appointments
       WHERE doctor_id = ? AND DATE(scheduled_at) = ? AND status IN ('booked')`,
      [doctorId, date],
    );
    return availableSlots(rows.map(r => r.slot).filter(Boolean));
  },

  async book(a) {
    const code = makeAppointmentCode();
    const scheduledAt = `${a.date} ${a.timeSlot}:00`;
    const [r] = await pool.query(
      `INSERT INTO healthcare_appointments
        (appointment_code, user_id, doctor_id, consultation_type, patient_name, patient_age,
         symptoms, scheduled_at, time_slot, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'booked')`,
      [code, a.userId, a.doctorId, a.consultationType, a.patientName, a.patientAge || null,
        a.symptoms || null, scheduledAt, a.timeSlot],
    );
    return { id: r.insertId, appointmentCode: code, date: a.date, timeSlot: a.timeSlot };
  },

  async listMyAppointments(userId) {
    const [rows] = await pool.query(
      `SELECT a.id, a.appointment_code AS appointmentCode, a.consultation_type AS consultationType,
              a.patient_name AS patientName, a.patient_age AS patientAge, a.symptoms,
              a.scheduled_at AS scheduledAt, a.time_slot AS timeSlot, a.status,
              d.name AS doctorName, d.specialty
       FROM healthcare_appointments a
       JOIN doctors d ON d.id = a.doctor_id
       WHERE a.user_id = ?
       ORDER BY a.scheduled_at DESC, a.id DESC`,
      [userId],
    );
    return rows;
  },

  async orderMedicine({ userId, items, deliveryNote }) {
    const [r] = await pool.query(
      `INSERT INTO medicine_orders (user_id, items, delivery_note, status)
       VALUES (?, ?, ?, 'placed')`,
      [userId, items, deliveryNote || null],
    );
    return { id: r.insertId, status: 'placed' };
  },
};

module.exports = HealthcareModel;
