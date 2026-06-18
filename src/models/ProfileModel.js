const { pool } = require('../config/db');

function maskId(num) {
  if (!num) return null;
  const s = String(num);
  return s.length <= 4 ? s : `${'X'.repeat(s.length - 4)}${s.slice(-4)}`;
}

const DEFAULT_CHANNELS = { push: true, sms: true, whatsapp: true, email: false };

const ProfileModel = {
  // Assemble the full profile shape the app expects.
  async getProfile(userId) {
    const [[u]] = await pool.query(
      `SELECT id, name, mobile, email, profile_photo AS profilePhoto,
              kyc_status AS kycStatus, kyc_id_type AS kycIdType,
              kyc_id_number AS kycIdNumber, kyc_reviewed_at AS kycReviewedAt
       FROM users WHERE id = ? LIMIT 1`, [userId],
    );
    const [[p]] = await pool.query(`SELECT * FROM user_profiles WHERE user_id = ? LIMIT 1`, [userId]);
    const [[pref]] = await pool.query(`SELECT * FROM user_preferences WHERE user_id = ? LIMIT 1`, [userId]);
    const [family] = await pool.query(
      `SELECT id, name, relation, age, phone FROM family_members WHERE user_id = ? ORDER BY id ASC`, [userId],
    );
    // Unit/tower/project from the linked booking.
    const [[unit]] = await pool.query(
      `SELECT b.unit_number AS unit, b.tower, p2.name AS projectName
       FROM booking_owners bo JOIN bookings b ON b.id = bo.booking_id
       LEFT JOIN projects p2 ON p2.id = b.project_id
       WHERE bo.user_id = ? ORDER BY (bo.role = 'primary') DESC, b.id LIMIT 1`, [userId],
    );

    // Admin-assigned properties (a resident can own one or more flats).
    const [properties] = await pool.query(
      `SELECT id, label, project_name AS projectName, tower, flat_no AS flatNo, floor,
              area_sqft AS areaSqft, property_type AS propertyType, address_line AS addressLine,
              city, state, pincode
       FROM user_properties WHERE user_id = ? ORDER BY id ASC`, [userId],
    );

    let channels = DEFAULT_CHANNELS;
    if (pref?.channels) { try { channels = typeof pref.channels === 'string' ? JSON.parse(pref.channels) : pref.channels; } catch { /* default */ } }

    const statusMap = { none: 'not_started', pending: 'submitted', approved: 'verified', rejected: 'rejected' };
    return {
      personal: {
        name: u?.name || '', mobile: u?.mobile || '', email: u?.email || '',
        photo: u?.profilePhoto || '',
        dob: p?.dob || '', gender: p?.gender || '', altPhone: p?.alt_phone || '', occupation: p?.occupation || '',
        addressLine: p?.address_line || '', city: p?.city || '', state: p?.state || '', pincode: p?.pincode || '',
        tower: unit?.tower || '', unit: unit?.unit || '', projectName: unit?.projectName || '',
      },
      properties: properties || [],
      preferences: {
        language: pref?.language || 'en', dietary: pref?.dietary || 'veg',
        channels, festivalAlerts: pref ? !!pref.festival_alerts : true,
      },
      family,
      kyc: {
        status: statusMap[u?.kycStatus] || 'not_started',
        idType: u?.kycIdType || null,
        idNumberMasked: maskId(u?.kycIdNumber),
        submittedAt: u?.kycStatus && u.kycStatus !== 'none' ? (u.kycReviewedAt || null) : null,
        verifiedAt: u?.kycStatus === 'approved' ? u.kycReviewedAt : null,
      },
    };
  },

  async updatePersonal(userId, d) {
    if (d.name !== undefined || d.email !== undefined) {
      await pool.query(`UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email) WHERE id = ?`,
        [d.name ?? null, d.email ?? null, userId]);
    }
    await pool.query(
      `INSERT INTO user_profiles (user_id, dob, gender, alt_phone, occupation, address_line, city, state, pincode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE dob=VALUES(dob), gender=VALUES(gender), alt_phone=VALUES(alt_phone),
         occupation=VALUES(occupation), address_line=VALUES(address_line), city=VALUES(city),
         state=VALUES(state), pincode=VALUES(pincode)`,
      [userId, d.dob || null, d.gender || null, d.altPhone || null, d.occupation || null,
       d.addressLine || null, d.city || null, d.state || null, d.pincode || null],
    );
    return this.getProfile(userId);
  },

  async updatePreferences(userId, d) {
    await pool.query(
      `INSERT INTO user_preferences (user_id, language, dietary, channels, festival_alerts)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE language=VALUES(language), dietary=VALUES(dietary),
         channels=VALUES(channels), festival_alerts=VALUES(festival_alerts)`,
      [userId, d.language || 'en', d.dietary || 'veg', JSON.stringify(d.channels || DEFAULT_CHANNELS), d.festivalAlerts ? 1 : 0],
    );
    return this.getProfile(userId);
  },

  async addFamily(userId, d) {
    await pool.query(
      `INSERT INTO family_members (user_id, name, relation, age, phone) VALUES (?, ?, ?, ?, ?)`,
      [userId, d.name, d.relation || null, d.age || null, d.phone || null],
    );
    return this.getProfile(userId);
  },

  async updateFamily(userId, id, d) {
    await pool.query(
      `UPDATE family_members SET name = ?, relation = ?, age = ?, phone = ? WHERE id = ? AND user_id = ?`,
      [d.name, d.relation || null, d.age || null, d.phone || null, id, userId],
    );
    return this.getProfile(userId);
  },

  async removeFamily(userId, id) {
    await pool.query(`DELETE FROM family_members WHERE id = ? AND user_id = ?`, [id, userId]);
    return this.getProfile(userId);
  },

  async submitKyc(userId, d) {
    await pool.query(
      `UPDATE users SET kyc_status = 'pending', kyc_id_type = ?, kyc_id_number = ?, kyc_reviewed_at = NULL, kyc_reject_reason = NULL WHERE id = ?`,
      [d.idType || null, d.idNumber || null, userId],
    );
    return this.getProfile(userId);
  },

  // ---------- Settings (user-level JSON) ----------
  async getSettings(userId) {
    const [[row]] = await pool.query(`SELECT data FROM user_settings WHERE user_id = ? LIMIT 1`, [userId]);
    const defaults = {
      language: 'en',
      notifications: { master: true, announcements: true, payments: true, services: true, reminders: true },
      privacy: { analytics: true, profileVisible: true, biometricLock: false },
    };
    if (!row?.data) return defaults;
    try { return { ...defaults, ...(typeof row.data === 'string' ? JSON.parse(row.data) : row.data) }; }
    catch { return defaults; }
  },

  async updateSettings(userId, payload) {
    const current = await this.getSettings(userId);
    const merged = { ...current, ...payload };
    await pool.query(
      `INSERT INTO user_settings (user_id, data) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE data = VALUES(data)`,
      [userId, JSON.stringify(merged)],
    );
    return merged;
  },
};

module.exports = ProfileModel;
