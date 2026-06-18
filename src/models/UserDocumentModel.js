const { pool } = require('../config/db');

const UserDocumentModel = {
  async listForUser(userId, kind) {
    const params = [userId];
    let where = 'user_id = ?';
    if (kind) { where += ' AND kind = ?'; params.push(kind); }
    const [rows] = await pool.query(
      `SELECT id, title, file_url AS url, kind, created_at AS createdAt
       FROM user_documents WHERE ${where} ORDER BY created_at DESC, id DESC`, params,
    );
    return rows;
  },

  async add(userId, { title, url, kind }) {
    const [r] = await pool.query(
      'INSERT INTO user_documents (user_id, title, file_url, kind) VALUES (?, ?, ?, ?)',
      [userId, title, url, kind || 'booking_docket'],
    );
    return r.insertId;
  },

  async remove(id) {
    const [r] = await pool.query('DELETE FROM user_documents WHERE id = ?', [id]);
    return r.affectedRows > 0;
  },

  async docProperty(id) {
    const [[row]] = await pool.query('SELECT user_id AS userId FROM user_documents WHERE id = ? LIMIT 1', [id]);
    return row ? row.userId : null;
  },

  // Residents list with their booking-docket count, for the admin tab.
  async residents({ search } = {}) {
    const params = [];
    let where = '1=1';
    if (search) {
      where += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.mobile LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.mobile,
              (SELECT COUNT(*) FROM user_documents d WHERE d.user_id = u.id AND d.kind = 'booking_docket') AS docketCount
       FROM users u WHERE ${where} ORDER BY u.name ASC, u.id ASC`, params,
    );
    return rows;
  },
};

module.exports = UserDocumentModel;
