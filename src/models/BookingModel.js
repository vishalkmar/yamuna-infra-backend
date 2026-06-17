const { pool } = require('../config/db');

const BookingModel = {
  // ----- Booking core -----

  async findById(bookingId) {
    const [rows] = await pool.query(
      `SELECT b.id, b.booking_code AS bookingId, b.unit_number AS unitNumber,
              b.tower, b.floor, b.area_sqft AS area, b.booking_date AS bookingDate,
              b.agreement_value AS agreementValue, b.allottee_names AS allotteeNames,
              b.status, p.name AS projectName, p.id AS projectId,
              r.name AS rmName, r.phone AS rmPhone, r.email AS rmEmail
       FROM bookings b
       LEFT JOIN projects p ON p.id = b.project_id
       LEFT JOIN relationship_managers r ON r.id = b.rm_id
       WHERE b.booking_code = ? LIMIT 1`,
      [bookingId],
    );
    return rows[0] || null;
  },

  async listForUser(userId) {
    const [rows] = await pool.query(
      `SELECT b.booking_code AS bookingId, b.unit_number AS unitNumber, b.status,
              p.name AS projectName, bo.role
       FROM bookings b
       JOIN booking_owners bo ON bo.booking_id = b.id
       LEFT JOIN projects p ON p.id = b.project_id
       WHERE bo.user_id = ?
       ORDER BY b.created_at DESC`,
      [userId],
    );
    return rows;
  },

  // ----- Ownership check (security boundary) -----

  async isOwner(bookingCode, userId) {
    const [rows] = await pool.query(
      `SELECT 1 FROM booking_owners bo
       JOIN bookings b ON b.id = bo.booking_id
       WHERE b.booking_code = ? AND bo.user_id = ? LIMIT 1`,
      [bookingCode, userId],
    );
    return rows.length > 0;
  },

  // ----- Documents -----

  async getDocuments(bookingCode, opts = {}) {
    const { search, category, from, to, includeArchived = false, limit = 200 } = opts;
    const where = ['b.booking_code = ?'];
    const params = [bookingCode];

    if (!includeArchived) where.push('d.archived_at IS NULL');

    if (category && category !== 'all') {
      where.push('d.category = ?');
      params.push(category);
    }
    if (search && search.trim().length > 0) {
      where.push('(d.name LIKE ? OR d.financial_year LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term);
    }
    if (from) {
      where.push('DATE(d.uploaded_at) >= ?');
      params.push(from);
    }
    if (to) {
      where.push('DATE(d.uploaded_at) <= ?');
      params.push(to);
    }
    params.push(Number(limit) || 200);

    const [rows] = await pool.query(
      `SELECT d.id, d.name, d.category, d.file_size AS size, d.uploaded_at AS date,
              d.requires_signature AS requiresSignature,
              d.signed_at AS signedAt,
              d.view_count AS viewCount,
              d.last_viewed_at AS lastViewedAt,
              d.archived_at AS archivedAt,
              d.financial_year AS financialYear,
              CASE
                WHEN d.requires_signature = 0 THEN 'available'
                WHEN d.signed_at IS NOT NULL  THEN 'signed'
                ELSE 'pending_signature'
              END AS status
       FROM documents d
       JOIN bookings b ON b.id = d.booking_id
       WHERE ${where.join(' AND ')}
       ORDER BY d.uploaded_at DESC, d.id DESC
       LIMIT ?`,
      params,
    );
    return rows;
  },

  async getDocumentCategories(bookingCode) {
    const [rows] = await pool.query(
      `SELECT d.category, COUNT(*) AS total,
              SUM(d.requires_signature = 1 AND d.signed_at IS NULL) AS pendingSign,
              SUM(d.archived_at IS NULL) AS active
       FROM documents d
       JOIN bookings b ON b.id = d.booking_id
       WHERE b.booking_code = ?
       GROUP BY d.category
       ORDER BY total DESC`,
      [bookingCode],
    );
    return rows.map(r => ({
      category: r.category,
      total: Number(r.total),
      pendingSign: Number(r.pendingSign) || 0,
      active: Number(r.active) || 0,
    }));
  },

  async getDocumentsByIds(bookingCode, ids) {
    if (!ids?.length) return [];
    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await pool.query(
      `SELECT d.id, d.name, d.category, d.file_size AS size,
              d.storage_path AS path, d.requires_signature AS requiresSignature,
              d.signed_at AS signedAt, b.id AS bookingPk
       FROM documents d
       JOIN bookings b ON b.id = d.booking_id
       WHERE b.booking_code = ? AND d.id IN (${placeholders})`,
      [bookingCode, ...ids],
    );
    return rows;
  },

  async logDocumentView({ documentId, userId, source = 'detail' }) {
    await pool.query(
      `INSERT INTO document_views (document_id, user_id, source) VALUES (?, ?, ?)`,
      [documentId, userId, source],
    );
    await pool.query(
      `UPDATE documents SET view_count = view_count + 1, last_viewed_at = NOW()
       WHERE id = ?`,
      [documentId],
    );
  },

  async logShareEvent({ userId, documentIds, channel, recipient }) {
    await pool.query(
      `INSERT INTO document_share_events (user_id, document_ids, channel, recipient, doc_count)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, JSON.stringify(documentIds), channel, recipient || null, documentIds.length],
    );
  },

  async findDocument(bookingCode, docId) {
    const [rows] = await pool.query(
      `SELECT d.id, d.name, d.category, d.file_size AS size,
              d.storage_path AS path, d.requires_signature AS requiresSignature,
              d.signed_at AS signedAt, d.provider_envelope_id AS providerEnvelopeId,
              b.id AS bookingPk
       FROM documents d
       JOIN bookings b ON b.id = d.booking_id
       WHERE b.booking_code = ? AND d.id = ? LIMIT 1`,
      [bookingCode, docId],
    );
    return rows[0] || null;
  },

  // ----- E-signature -----

  async logEsignatureEvent({ documentId, bookingPk, userId, envelopeId, status, ip, userAgent, notes }) {
    await pool.query(
      `INSERT INTO esignature_events (document_id, booking_id, user_id, envelope_id, status, ip_address, user_agent, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [documentId, bookingPk, userId, envelopeId || null, status, ip || null, userAgent || null, notes || null],
    );
  },

  async markDocumentSigned({ documentId, userId, envelopeId }) {
    await pool.query(
      `UPDATE documents SET signed_at = NOW(), signed_by_user_id = ?, provider_envelope_id = COALESCE(?, provider_envelope_id)
       WHERE id = ?`,
      [userId, envelopeId || null, documentId],
    );
  },

  async getEsignatureHistory(bookingCode, documentId) {
    const [rows] = await pool.query(
      `SELECT e.id, e.status, e.envelope_id AS envelopeId, e.notes, e.created_at AS createdAt
       FROM esignature_events e
       JOIN bookings b ON b.id = e.booking_id
       WHERE b.booking_code = ? AND e.document_id = ?
       ORDER BY e.id DESC`,
      [bookingCode, documentId],
    );
    return rows;
  },

  // ----- Welcome kit -----

  async getWelcomeKit(projectId) {
    const [rows] = await pool.query(
      `SELECT id, kind, title, caption, url, sort_order AS sortOrder
       FROM welcome_kit_items
       WHERE project_id = ? AND active = 1
       ORDER BY sort_order ASC, id ASC`,
      [projectId],
    );
    return rows;
  },
};

module.exports = BookingModel;
