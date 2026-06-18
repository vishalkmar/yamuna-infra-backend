const { pool } = require('../config/db');

// Pick a resident's property unit/tower from their linked booking (primary first).
const UNIT_SUBQ = `
  (SELECT b.unit_number FROM booking_owners bo JOIN bookings b ON b.id = bo.booking_id
   WHERE bo.user_id = u.id ORDER BY (bo.role = 'primary') DESC, b.id LIMIT 1)`;
const TOWER_SUBQ = `
  (SELECT b.tower FROM booking_owners bo JOIN bookings b ON b.id = bo.booking_id
   WHERE bo.user_id = u.id ORDER BY (bo.role = 'primary') DESC, b.id LIMIT 1)`;

const AdminUserModel = {
  async list({ search, kyc, active, page = 1, pageSize = 20 } = {}) {
    const where = ['1=1'];
    const params = [];
    if (search) {
      where.push(`(u.name LIKE ? OR u.mobile LIKE ? OR u.email LIKE ?)`);
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    if (kyc) { where.push('u.kyc_status = ?'); params.push(kyc); }
    if (active === 'true' || active === 'false') {
      where.push('u.is_active = ?'); params.push(active === 'true' ? 1 : 0);
    }
    const whereSql = where.join(' AND ');

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM users u WHERE ${whereSql}`, params,
    );
    const total = countRows[0].total;

    const limit = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
    const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.mobile, u.email, u.profile_photo AS profilePhoto,
              u.is_active AS isActive, u.kyc_status AS kycStatus, u.created_at AS createdAt,
              (SELECT COUNT(*) FROM user_properties up WHERE up.user_id = u.id) AS propertyCount,
              ${UNIT_SUBQ} AS unit, ${TOWER_SUBQ} AS tower
       FROM users u
       WHERE ${whereSql}
       ORDER BY u.created_at DESC, u.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { rows, total, page: Math.max(parseInt(page, 10) || 1, 1), pageSize: limit };
  },

  async getById(id) {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.mobile, u.email, u.profile_photo AS profilePhoto,
              u.created_source AS createdSource, u.is_active AS isActive,
              u.kyc_status AS kycStatus, u.kyc_id_type AS kycIdType,
              u.kyc_id_number AS kycIdNumber, u.kyc_reviewed_at AS kycReviewedAt,
              u.kyc_reject_reason AS kycRejectReason, u.admin_notes AS adminNotes,
              u.primary_booking_id AS primaryBookingId, u.created_at AS createdAt,
              p.address_line AS addressLine, p.city AS city, p.state AS state, p.pincode AS pincode,
              ${UNIT_SUBQ} AS unit, ${TOWER_SUBQ} AS tower
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE u.id = ? LIMIT 1`,
      [id],
    );
    const user = rows[0];
    if (!user) return null;

    const properties = await this.listProperties(id);
    const [contacts] = await pool.query(
      `SELECT id, name, phone, relation, is_primary AS isPrimary
       FROM emergency_contacts WHERE user_id = ? ORDER BY is_primary DESC, id ASC`,
      [id],
    );
    const [medical] = await pool.query(
      `SELECT blood_group AS bloodGroup, medical_notes AS medicalNotes, updated_at AS updatedAt
       FROM medical_profiles WHERE user_id = ? LIMIT 1`,
      [id],
    );
    return { ...user, properties, emergencyContacts: contacts, medicalProfile: medical[0] || null };
  },

  async findByEmail(email) {
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    return rows[0] || null;
  },

  async findByMobile(mobile) {
    const [rows] = await pool.query('SELECT id FROM users WHERE mobile = ? LIMIT 1', [mobile]);
    return rows[0] || null;
  },

  // Create an admin-managed resident: core user row + self-address + properties.
  async create(d) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [r] = await conn.query(
        `INSERT INTO users (mobile, name, email, profile_photo, created_source, is_active)
         VALUES (?, ?, ?, ?, 'admin', 1)`,
        [d.mobile, d.name || null, d.email || null, d.profilePhoto || null],
      );
      const id = r.insertId;

      if (d.addressLine || d.city || d.state || d.pincode) {
        await conn.query(
          `INSERT INTO user_profiles (user_id, address_line, city, state, pincode)
           VALUES (?, ?, ?, ?, ?)`,
          [id, d.addressLine || null, d.city || null, d.state || null, d.pincode || null],
        );
      }

      for (const p of d.properties || []) {
        await conn.query(
          `INSERT INTO user_properties
            (user_id, label, project_name, tower, flat_no, floor, area_sqft, property_type,
             address_line, city, state, pincode, notes,
             work_status, work_target_date, work_percent, floors_total, floors_done)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, p.label || null, p.projectName || null, p.tower || null, p.flatNo || null,
           p.floor || null, p.areaSqft || null, p.propertyType || null, p.addressLine || null,
           p.city || null, p.state || null, p.pincode || null, p.notes || null,
           p.workStatus || 'expected', p.workTargetDate || null, p.workPercent ?? 0,
           p.floorsTotal ?? null, p.floorsDone ?? null],
        );
      }

      await conn.commit();
      return this.getById(id);
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  },

  // Update core fields + self-address. Properties are managed via their own
  // endpoints. Only provided fields are changed.
  async update(id, d) {
    await pool.query(
      `UPDATE users SET
         name = COALESCE(?, name),
         email = COALESCE(?, email),
         mobile = COALESCE(?, mobile),
         profile_photo = COALESCE(?, profile_photo)
       WHERE id = ?`,
      [d.name ?? null, d.email ?? null, d.mobile ?? null, d.profilePhoto ?? null, id],
    );
    if (d.addressLine !== undefined || d.city !== undefined || d.state !== undefined || d.pincode !== undefined) {
      await pool.query(
        `INSERT INTO user_profiles (user_id, address_line, city, state, pincode)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE address_line=VALUES(address_line), city=VALUES(city),
           state=VALUES(state), pincode=VALUES(pincode)`,
        [id, d.addressLine || null, d.city || null, d.state || null, d.pincode || null],
      );
    }
    return this.getById(id);
  },

  async remove(id) {
    const [r] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
    return r.affectedRows > 0;
  },

  // ---------- Properties ----------
  async listProperties(userId) {
    const [rows] = await pool.query(
      `SELECT id, label, project_name AS projectName, tower, flat_no AS flatNo, floor,
              area_sqft AS areaSqft, property_type AS propertyType, address_line AS addressLine,
              city, state, pincode, notes,
              work_status AS workStatus, work_target_date AS workTargetDate,
              work_percent AS workPercent, floors_total AS floorsTotal, floors_done AS floorsDone,
              created_at AS createdAt
       FROM user_properties WHERE user_id = ? ORDER BY id ASC`,
      [userId],
    );
    return rows;
  },

  async addProperty(userId, p) {
    const [r] = await pool.query(
      `INSERT INTO user_properties
        (user_id, label, project_name, tower, flat_no, floor, area_sqft, property_type,
         address_line, city, state, pincode, notes,
         work_status, work_target_date, work_percent, floors_total, floors_done)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, p.label || null, p.projectName || null, p.tower || null, p.flatNo || null,
       p.floor || null, p.areaSqft || null, p.propertyType || null, p.addressLine || null,
       p.city || null, p.state || null, p.pincode || null, p.notes || null,
       p.workStatus || 'expected', p.workTargetDate || null, p.workPercent ?? 0,
       p.floorsTotal ?? null, p.floorsDone ?? null],
    );
    return r.insertId;
  },

  async updateProperty(userId, propertyId, p) {
    const [r] = await pool.query(
      `UPDATE user_properties SET
         label = ?, project_name = ?, tower = ?, flat_no = ?, floor = ?, area_sqft = ?,
         property_type = ?, address_line = ?, city = ?, state = ?, pincode = ?, notes = ?,
         work_status = COALESCE(?, work_status), work_target_date = ?,
         work_percent = COALESCE(?, work_percent), floors_total = ?, floors_done = ?
       WHERE id = ? AND user_id = ?`,
      [p.label || null, p.projectName || null, p.tower || null, p.flatNo || null, p.floor || null,
       p.areaSqft || null, p.propertyType || null, p.addressLine || null, p.city || null,
       p.state || null, p.pincode || null, p.notes || null,
       p.workStatus ?? null, p.workTargetDate || null, p.workPercent ?? null,
       p.floorsTotal ?? null, p.floorsDone ?? null, propertyId, userId],
    );
    return r.affectedRows > 0;
  },

  async removeProperty(userId, propertyId) {
    const [r] = await pool.query('DELETE FROM user_properties WHERE id = ? AND user_id = ?', [propertyId, userId]);
    return r.affectedRows > 0;
  },

  async setStatus(id, isActive) {
    const [r] = await pool.query(`UPDATE users SET is_active = ? WHERE id = ?`, [isActive ? 1 : 0, id]);
    return r.affectedRows > 0;
  },

  async setNotes(id, notes) {
    const [r] = await pool.query(`UPDATE users SET admin_notes = ? WHERE id = ?`, [notes ?? null, id]);
    return r.affectedRows > 0;
  },

  async reviewKyc(id, action, reason) {
    const status = action === 'approve' ? 'approved' : 'rejected';
    const [r] = await pool.query(
      `UPDATE users
       SET kyc_status = ?, kyc_reviewed_at = CURRENT_TIMESTAMP,
           kyc_reject_reason = ?
       WHERE id = ?`,
      [status, action === 'reject' ? (reason || null) : null, id],
    );
    return r.affectedRows > 0;
  },

  // Combined activity feed across all per-resident booking/order tables.
  async activity(id) {
    const p = Array(9).fill(id);
    const [rows] = await pool.query(
      `SELECT * FROM (
        SELECT 'service' AS kind, sb.id AS refId,
               COALESCE(c.name,'Service') AS label, sb.status AS status,
               sb.start_date AS eventDate, sb.created_at AS createdAt
          FROM service_bookings sb LEFT JOIN service_categories c ON c.id = sb.category_id
          WHERE sb.user_id = ?
        UNION ALL
        SELECT 'meal', mo.id, CONCAT('Meal: ', mo.meal_types), mo.status, mo.meal_date, mo.created_at
          FROM meal_orders mo WHERE mo.user_id = ?
        UNION ALL
        SELECT 'appointment', a.id, CONCAT('Consult: ', a.patient_name), a.status, a.scheduled_at, a.created_at
          FROM healthcare_appointments a WHERE a.user_id = ?
        UNION ALL
        SELECT 'mobility', mb.id, CONCAT('Mobility aid (', mb.mode, ')'), mb.status, mb.start_date, mb.created_at
          FROM mobility_bookings mb WHERE mb.user_id = ?
        UNION ALL
        SELECT 'wellness', wb.id, 'Wellness therapy', wb.status, wb.visit_date, wb.created_at
          FROM wellness_bookings wb WHERE wb.user_id = ?
        UNION ALL
        SELECT 'amenity', ab.id, COALESCE(ab.occasion, 'Amenity booking'), ab.status, ab.booking_date, ab.created_at
          FROM amenity_bookings ab WHERE ab.user_id = ?
        UNION ALL
        SELECT 'darshan', dbk.id, COALESCE(dbk.group_name, 'Darshan'), dbk.status, dbk.visit_date, dbk.created_at
          FROM darshan_bookings dbk WHERE dbk.user_id = ?
        UNION ALL
        SELECT 'visitor', vp.id, CONCAT('Visitor: ', vp.guest_name), vp.status, vp.visit_date, vp.created_at
          FROM visitor_passes vp WHERE vp.user_id = ?
        UNION ALL
        SELECT 'sos', s.id, s.request_code, s.status, DATE(s.created_at), s.created_at
          FROM sos_requests s WHERE s.user_id = ?
      ) feed
      ORDER BY createdAt DESC
      LIMIT 100`,
      p,
    );
    return rows;
  },
};

module.exports = AdminUserModel;
