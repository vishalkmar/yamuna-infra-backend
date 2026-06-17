const { pool } = require('../config/db');

const ServiceModel = {
  async listCategories() {
    const [rows] = await pool.query(
      `SELECT id, code, name, icon, image_url AS imageUrl
       FROM service_categories
       WHERE is_active = 1
       ORDER BY sort_order ASC, id ASC`,
    );
    return rows;
  },

  // Active offerings for a provider (resident-facing drill-down). Admin manages
  // these via the portal (Module A4); the app reads exactly what's active.
  async listOfferings(providerId) {
    const [rows] = await pool.query(
      `SELECT id, name, description, price, unit, image_url AS imageUrl
       FROM provider_offerings
       WHERE provider_id = ? AND is_active = 1
       ORDER BY sort_order ASC, id ASC`,
      [providerId],
    );
    return rows;
  },

  async listProviders({ categoryCode, genderPref } = {}) {
    const where = ['p.active = 1'];
    const params = [];
    if (categoryCode) {
      where.push('c.code = ?');
      params.push(categoryCode);
    }
    // 'any' (or unset) means no gender filter; a specific pref also allows 'any' providers.
    if (genderPref && genderPref !== 'any') {
      where.push('(p.gender = ? OR p.gender = ?)');
      params.push(genderPref, 'any');
    }
    const [rows] = await pool.query(
      `SELECT p.id, p.name, p.tagline, p.image_url AS imageUrl, p.phone, p.gender, p.rating,
              p.experience_years AS experienceYears, p.price_from AS priceFrom, p.featured,
              c.code AS categoryCode, c.name AS categoryName
       FROM service_providers p
       JOIN service_categories c ON c.id = p.category_id
       WHERE ${where.join(' AND ')}
       ORDER BY p.featured DESC, p.sort_order ASC, p.rating DESC, p.id ASC`,
      params,
    );
    return rows;
  },

  async book(b) {
    const [c] = await pool.query(`SELECT id FROM service_categories WHERE code = ? LIMIT 1`, [b.categoryCode]);
    const categoryId = c[0]?.id;
    if (!categoryId) return null;

    const meals = Array.isArray(b.meals) && b.meals.length ? b.meals.join(',') : null;
    const [r] = await pool.query(
      `INSERT INTO service_bookings
        (user_id, category_id, provider_id, start_date, frequency, preferred_time,
         meals, diet_type, persons, special_notes, gender_pref, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'booked')`,
      [
        b.userId, categoryId, b.providerId || null, b.startDate, b.frequency,
        b.preferredTime || null, meals, b.dietType || null, b.persons || null,
        b.specialNotes || null, b.genderPref || 'any',
      ],
    );
    return { id: r.insertId };
  },

  async listMyBookings(userId, { categoryCode } = {}) {
    const where = ['sb.user_id = ?'];
    const params = [userId];
    if (categoryCode) {
      where.push('c.code = ?');
      params.push(categoryCode);
    }
    const [rows] = await pool.query(
      `SELECT sb.id, sb.start_date AS startDate, sb.frequency, sb.preferred_time AS preferredTime,
              sb.meals, sb.diet_type AS dietType, sb.persons,
              sb.special_notes AS specialNotes, sb.gender_pref AS genderPref, sb.status,
              sb.created_at AS createdAt,
              c.code AS categoryCode, c.name AS categoryName,
              p.name AS providerName, p.phone AS providerPhone
       FROM service_bookings sb
       JOIN service_categories c ON c.id = sb.category_id
       LEFT JOIN service_providers p ON p.id = sb.provider_id
       WHERE ${where.join(' AND ')}
       ORDER BY sb.created_at DESC, sb.id DESC`,
      params,
    );
    return rows.map(r => ({ ...r, meals: r.meals ? r.meals.split(',') : [] }));
  },
};

module.exports = ServiceModel;
