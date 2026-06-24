const { pool } = require('../config/db');

// Inventory catalog (AMS Module 2.1): agent_projects → towers → units. Pure DB layer,
// camelCase aliases on read.
const AdminProjectModel = {
  // ---------------- Projects ----------------
  async listProjects({ search, status } = {}) {
    const where = ['1=1'];
    const params = [];
    if (search) { where.push('(p.name LIKE ? OR p.location LIKE ? OR p.city LIKE ?)'); const l = `%${search}%`; params.push(l, l, l); }
    if (status) { where.push('p.status = ?'); params.push(status); }
    const [rows] = await pool.query(
      `SELECT p.id, p.name, p.location, p.city, p.state, p.status, p.rera_no AS reraNo,
              p.description, p.image_url AS imageUrl, p.price_from AS priceFrom,
              p.price_to AS priceTo, p.is_active AS isActive, p.sort_order AS sortOrder,
              (SELECT COUNT(*) FROM project_towers t WHERE t.project_id = p.id) AS towerCount,
              (SELECT COUNT(*) FROM units u WHERE u.project_id = p.id) AS unitCount,
              (SELECT COUNT(*) FROM units u WHERE u.project_id = p.id AND u.status = 'available') AS availableCount
       FROM agent_projects p
       WHERE ${where.join(' AND ')}
       ORDER BY p.sort_order ASC, p.id DESC`,
      params,
    );
    return rows;
  },

  async getProject(id) {
    const [rows] = await pool.query(
      `SELECT id, name, location, city, state, status, rera_no AS reraNo, description,
              image_url AS imageUrl, price_from AS priceFrom, price_to AS priceTo,
              is_active AS isActive, sort_order AS sortOrder
       FROM agent_projects WHERE id = ? LIMIT 1`,
      [id],
    );
    return rows[0] || null;
  },

  async createProject(d) {
    const [r] = await pool.query(
      `INSERT INTO agent_projects
        (name, location, city, state, status, rera_no, description, image_url,
         price_from, price_to, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.name, d.location || null, d.city || null, d.state || null, d.status || 'ongoing',
       d.reraNo || null, d.description || null, d.imageUrl || null,
       d.priceFrom || 0, d.priceTo || 0, d.isActive ? 1 : 0, d.sortOrder || 0],
    );
    return { id: r.insertId };
  },

  async updateProject(id, d) {
    const [r] = await pool.query(
      `UPDATE agent_projects
       SET name = ?, location = ?, city = ?, state = ?, status = ?, rera_no = ?,
           description = ?, image_url = ?, price_from = ?, price_to = ?,
           is_active = ?, sort_order = ?
       WHERE id = ?`,
      [d.name, d.location || null, d.city || null, d.state || null, d.status || 'ongoing',
       d.reraNo || null, d.description || null, d.imageUrl || null,
       d.priceFrom || 0, d.priceTo || 0, d.isActive ? 1 : 0, d.sortOrder || 0, id],
    );
    return r.affectedRows > 0;
  },

  async deleteProject(id) {
    const [r] = await pool.query(`DELETE FROM agent_projects WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  },

  // status counts for a project's units
  async projectStats(id) {
    const [rows] = await pool.query(
      `SELECT
         COUNT(*) AS total,
         SUM(status = 'available') AS available,
         SUM(status = 'held') AS held,
         SUM(status = 'blocked') AS blocked,
         SUM(status = 'booked') AS booked,
         SUM(status = 'sold') AS sold
       FROM units WHERE project_id = ?`,
      [id],
    );
    const s = rows[0] || {};
    return {
      total: Number(s.total || 0), available: Number(s.available || 0),
      held: Number(s.held || 0), blocked: Number(s.blocked || 0),
      booked: Number(s.booked || 0), sold: Number(s.sold || 0),
    };
  },

  // ---------------- Towers ----------------
  async listTowers(projectId) {
    const [rows] = await pool.query(
      `SELECT t.id, t.project_id AS projectId, t.name, t.total_floors AS totalFloors,
              t.description, t.sort_order AS sortOrder,
              (SELECT COUNT(*) FROM units u WHERE u.tower_id = t.id) AS unitCount
       FROM project_towers t
       WHERE t.project_id = ?
       ORDER BY t.sort_order ASC, t.id ASC`,
      [projectId],
    );
    return rows;
  },

  async createTower(projectId, d) {
    const [r] = await pool.query(
      `INSERT INTO project_towers (project_id, name, total_floors, description, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [projectId, d.name, d.totalFloors || null, d.description || null, d.sortOrder || 0],
    );
    return { id: r.insertId };
  },

  async updateTower(id, d) {
    const [r] = await pool.query(
      `UPDATE project_towers SET name = ?, total_floors = ?, description = ?, sort_order = ? WHERE id = ?`,
      [d.name, d.totalFloors || null, d.description || null, d.sortOrder || 0, id],
    );
    return r.affectedRows > 0;
  },

  async deleteTower(id) {
    // Units keep existing; their tower_id is set NULL by the FK.
    const [r] = await pool.query(`DELETE FROM project_towers WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  },

  // ---------------- Units ----------------
  async listUnits({ projectId, towerId, status, search } = {}) {
    const where = ['1=1'];
    const params = [];
    if (projectId) { where.push('u.project_id = ?'); params.push(projectId); }
    if (towerId) { where.push('u.tower_id = ?'); params.push(towerId); }
    if (status) { where.push('u.status = ?'); params.push(status); }
    if (search) { where.push('(u.unit_no LIKE ? OR u.unit_type LIKE ?)'); const l = `%${search}%`; params.push(l, l); }
    const [rows] = await pool.query(
      `SELECT u.id, u.project_id AS projectId, u.tower_id AS towerId, t.name AS towerName,
              u.unit_no AS unitNo, u.floor, u.unit_type AS unitType, u.area_sqft AS areaSqft,
              u.base_price AS basePrice, u.facing, u.status, u.hold_until AS holdUntil,
              u.held_by_agent_id AS heldByAgentId, u.notes, u.sort_order AS sortOrder
       FROM units u
       LEFT JOIN project_towers t ON t.id = u.tower_id
       WHERE ${where.join(' AND ')}
       ORDER BY u.sort_order ASC, u.id ASC`,
      params,
    );
    return rows;
  },

  async getUnit(id) {
    const [rows] = await pool.query(
      `SELECT id, project_id AS projectId, tower_id AS towerId, unit_no AS unitNo, status,
              hold_until AS holdUntil, held_by_agent_id AS heldByAgentId
       FROM units WHERE id = ? LIMIT 1`,
      [id],
    );
    return rows[0] || null;
  },

  // Expire stale holds → back to available. Cheap; called before any unit list
  // so the board is always truthful without a cron. (A cron can also call it.)
  async releaseExpiredHolds() {
    const [r] = await pool.query(
      `UPDATE units
       SET status = 'available', hold_until = NULL, held_by_agent_id = NULL
       WHERE status = 'held' AND hold_until IS NOT NULL AND hold_until < NOW()`,
    );
    return r.affectedRows;
  },

  // Hold an AVAILABLE unit for `hours` (default 48). Optional agentId records who
  // holds it. Conditional UPDATE so two holds can't race. Returns conflict if the
  // unit isn't available.
  async holdUnit(id, { hours = 48, agentId = null } = {}) {
    const h = Math.max(1, Math.min(parseInt(hours, 10) || 48, 24 * 30));
    const [r] = await pool.query(
      `UPDATE units
       SET status = 'held', hold_until = DATE_ADD(NOW(), INTERVAL ? HOUR), held_by_agent_id = ?
       WHERE id = ? AND status = 'available'`,
      [h, agentId || null, id],
    );
    return { ok: r.affectedRows > 0 };
  },

  // Release a held/blocked unit back to available (clears hold fields).
  async releaseUnit(id) {
    const [r] = await pool.query(
      `UPDATE units SET status = 'available', hold_until = NULL, held_by_agent_id = NULL
       WHERE id = ? AND status IN ('held','blocked')`,
      [id],
    );
    return { ok: r.affectedRows > 0 };
  },

  // Block a unit (not sellable). Allowed from available/held.
  async blockUnit(id) {
    const [r] = await pool.query(
      `UPDATE units SET status = 'blocked', hold_until = NULL, held_by_agent_id = NULL
       WHERE id = ? AND status IN ('available','held')`,
      [id],
    );
    return { ok: r.affectedRows > 0 };
  },

  async createUnit(projectId, d) {
    const [r] = await pool.query(
      `INSERT INTO units
        (project_id, tower_id, unit_no, floor, unit_type, area_sqft, base_price, facing, status, notes, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [projectId, d.towerId || null, d.unitNo, d.floor || null, d.unitType || null,
       d.areaSqft || null, d.basePrice || 0, d.facing || null, d.status || 'available',
       d.notes || null, d.sortOrder || 0],
    );
    return { id: r.insertId };
  },

  async updateUnit(id, d) {
    const [r] = await pool.query(
      `UPDATE units
       SET tower_id = ?, unit_no = ?, floor = ?, unit_type = ?, area_sqft = ?,
           base_price = ?, facing = ?, status = ?, notes = ?, sort_order = ?
       WHERE id = ?`,
      [d.towerId || null, d.unitNo, d.floor || null, d.unitType || null, d.areaSqft || null,
       d.basePrice || 0, d.facing || null, d.status || 'available', d.notes || null,
       d.sortOrder || 0, id],
    );
    return r.affectedRows > 0;
  },

  // Generic status set (e.g. booked/sold). Clears hold fields unless keeping
  // 'held' — a plain status change shouldn't leave a stale hold owner/expiry.
  async setUnitStatus(id, status) {
    const clearHold = status !== 'held';
    const [r] = await pool.query(
      `UPDATE units SET status = ?${clearHold ? ', hold_until = NULL, held_by_agent_id = NULL' : ''} WHERE id = ?`,
      [status, id],
    );
    return r.affectedRows > 0;
  },

  async deleteUnit(id) {
    const [r] = await pool.query(`DELETE FROM units WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  },

  // Bulk-generate units: floors 1..floorCount, unitsPerFloor each, numbered
  // <floor><NN> (e.g. 101, 102...). Shared type / area / price / tower.
  async bulkCreateUnits(projectId, d) {
    const rows = [];
    const floors = Math.max(1, Math.min(parseInt(d.floorCount, 10) || 1, 200));
    const perFloor = Math.max(1, Math.min(parseInt(d.unitsPerFloor, 10) || 1, 50));
    for (let f = 1; f <= floors; f++) {
      for (let n = 1; n <= perFloor; n++) {
        const unitNo = `${f}${String(n).padStart(2, '0')}`;
        rows.push([
          projectId, d.towerId || null, unitNo, String(f), d.unitType || null,
          d.areaSqft || null, d.basePrice || 0, d.facing || null, 'available', null, 0,
        ]);
      }
    }
    if (rows.length === 0) return { created: 0 };
    const [r] = await pool.query(
      `INSERT INTO units
        (project_id, tower_id, unit_no, floor, unit_type, area_sqft, base_price, facing, status, notes, sort_order)
       VALUES ?`,
      [rows],
    );
    return { created: r.affectedRows };
  },
};

module.exports = AdminProjectModel;
