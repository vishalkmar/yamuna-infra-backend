const { pool } = require('../config/db');

const AdminHealthcareModel = {
  // ---------- Specialties ----------
  async listSpecialties() {
    const [rows] = await pool.query(
      `SELECT s.id, s.code, s.name, s.icon, s.is_active AS isActive, s.sort_order AS sortOrder,
              (SELECT COUNT(*) FROM doctors d WHERE d.specialty_id = s.id) AS doctorCount
       FROM specialties s ORDER BY s.sort_order ASC, s.id ASC`,
    );
    return rows;
  },

  async createSpecialty(d) {
    const [r] = await pool.query(
      `INSERT INTO specialties (code, name, icon, is_active, sort_order) VALUES (?, ?, ?, ?, ?)`,
      [d.code, d.name, d.icon || null, d.isActive ? 1 : 0, d.sortOrder || 0],
    );
    return { id: r.insertId };
  },

  async updateSpecialty(id, d) {
    const [r] = await pool.query(
      `UPDATE specialties SET name = ?, icon = ?, is_active = ?, sort_order = ? WHERE id = ?`,
      [d.name, d.icon || null, d.isActive ? 1 : 0, d.sortOrder || 0, id],
    );
    return r.affectedRows > 0;
  },

  async deleteSpecialty(id) {
    const [a] = await pool.query(`SELECT COUNT(*) AS n FROM doctors WHERE specialty_id = ?`, [id]);
    if (a[0].n > 0) return { blocked: true, doctorCount: a[0].n };
    const [r] = await pool.query(`DELETE FROM specialties WHERE id = ?`, [id]);
    return { deleted: r.affectedRows > 0 };
  },

  // ---------- Doctors ----------
  async listDoctors({ specialtyId, search } = {}) {
    const where = ['1=1'];
    const params = [];
    if (specialtyId) { where.push('d.specialty_id = ?'); params.push(specialtyId); }
    if (search) { where.push('(d.name LIKE ? OR d.specialty LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
    const [rows] = await pool.query(
      `SELECT d.id, d.name, d.image_url AS imageUrl, d.specialty, d.specialty_id AS specialtyId,
              s.name AS specialtyName, d.qualifications, d.description, d.experience_years AS experienceYears,
              d.fee, d.languages, d.rating, d.phone, d.available_days AS availableDays, d.slots,
              d.active AS isActive, d.sort_order AS sortOrder
       FROM doctors d LEFT JOIN specialties s ON s.id = d.specialty_id
       WHERE ${where.join(' AND ')}
       ORDER BY d.sort_order ASC, d.rating DESC, d.id ASC`,
      params,
    );
    return rows;
  },

  async createDoctor(d) {
    // Keep the legacy `specialty` string in sync with the chosen specialty.
    let specialtyName = d.specialty || null;
    if (d.specialtyId) {
      const [s] = await pool.query(`SELECT name FROM specialties WHERE id = ? LIMIT 1`, [d.specialtyId]);
      if (s[0]) specialtyName = s[0].name;
    }
    const [r] = await pool.query(
      `INSERT INTO doctors
        (name, image_url, specialty, specialty_id, qualifications, description, experience_years,
         fee, languages, rating, phone, available_days, slots, active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.name, d.imageUrl || null, specialtyName, d.specialtyId || null, d.qualifications || null,
       d.description || null, d.experienceYears || 0, d.fee || 0, d.languages || null, d.rating || 0,
       d.phone || null, d.availableDays || null, d.slots || null, d.isActive ? 1 : 0, d.sortOrder || 0],
    );
    return { id: r.insertId };
  },

  async updateDoctor(id, d) {
    let specialtyName = d.specialty || null;
    if (d.specialtyId) {
      const [s] = await pool.query(`SELECT name FROM specialties WHERE id = ? LIMIT 1`, [d.specialtyId]);
      if (s[0]) specialtyName = s[0].name;
    }
    const [r] = await pool.query(
      `UPDATE doctors
       SET name = ?, image_url = ?, specialty = ?, specialty_id = ?, qualifications = ?, description = ?,
           experience_years = ?, fee = ?, languages = ?, rating = ?, phone = ?, available_days = ?,
           slots = ?, active = ?, sort_order = ?
       WHERE id = ?`,
      [d.name, d.imageUrl || null, specialtyName, d.specialtyId || null, d.qualifications || null,
       d.description || null, d.experienceYears || 0, d.fee || 0, d.languages || null, d.rating || 0,
       d.phone || null, d.availableDays || null, d.slots || null, d.isActive ? 1 : 0, d.sortOrder || 0, id],
    );
    return r.affectedRows > 0;
  },

  async deleteDoctor(id) {
    const [r] = await pool.query(`DELETE FROM doctors WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  },

  // ---------- Appointments ----------
  async listAppointments({ status, page = 1, pageSize = 20 } = {}) {
    const where = ['1=1'];
    const params = [];
    if (status) { where.push('a.status = ?'); params.push(status); }
    const whereSql = where.join(' AND ');
    const [cnt] = await pool.query(`SELECT COUNT(*) AS total FROM healthcare_appointments a WHERE ${whereSql}`, params);
    const limit = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
    const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;
    const [rows] = await pool.query(
      `SELECT a.id, a.appointment_code AS appointmentCode, a.consultation_type AS consultationType,
              a.patient_name AS patientName, a.patient_age AS patientAge, a.scheduled_at AS scheduledAt,
              a.time_slot AS timeSlot, a.status, a.created_at AS createdAt,
              d.name AS doctorName, u.name AS userName, u.mobile AS userMobile
       FROM healthcare_appointments a
       LEFT JOIN doctors d ON d.id = a.doctor_id
       LEFT JOIN users u ON u.id = a.user_id
       WHERE ${whereSql}
       ORDER BY a.scheduled_at DESC, a.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { rows, total: cnt[0].total, page: Math.max(parseInt(page, 10) || 1, 1), pageSize: limit };
  },

  async updateAppointmentStatus(id, status) {
    const [r] = await pool.query(`UPDATE healthcare_appointments SET status = ? WHERE id = ?`, [status, id]);
    return r.affectedRows > 0;
  },

  // ---------- Medicine orders ----------
  async listMedicineOrders({ status, page = 1, pageSize = 20 } = {}) {
    const where = ['1=1'];
    const params = [];
    if (status) { where.push('m.status = ?'); params.push(status); }
    const whereSql = where.join(' AND ');
    const [cnt] = await pool.query(`SELECT COUNT(*) AS total FROM medicine_orders m WHERE ${whereSql}`, params);
    const limit = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
    const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;
    const [rows] = await pool.query(
      `SELECT m.id, m.items, m.delivery_note AS deliveryNote, m.status, m.created_at AS createdAt,
              u.name AS userName, u.mobile AS userMobile
       FROM medicine_orders m LEFT JOIN users u ON u.id = m.user_id
       WHERE ${whereSql}
       ORDER BY m.created_at DESC, m.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { rows, total: cnt[0].total, page: Math.max(parseInt(page, 10) || 1, 1), pageSize: limit };
  },

  async updateMedicineOrderStatus(id, status) {
    const [r] = await pool.query(`UPDATE medicine_orders SET status = ? WHERE id = ?`, [status, id]);
    return r.affectedRows > 0;
  },
};

module.exports = AdminHealthcareModel;
