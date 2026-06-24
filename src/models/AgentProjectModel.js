const { pool } = require('../config/db');

// Agent-facing read-only inventory browse (Module 2.1). Only active agent_projects;
// only the unit fields an agent needs to pitch + book.
const AgentProjectModel = {
  async listProjects({ search } = {}) {
    const where = ['p.is_active = 1'];
    const params = [];
    if (search) { where.push('(p.name LIKE ? OR p.location LIKE ? OR p.city LIKE ?)'); const l = `%${search}%`; params.push(l, l, l); }
    const [rows] = await pool.query(
      `SELECT p.id, p.name, p.location, p.city, p.state, p.status, p.rera_no AS reraNo,
              p.description, p.image_url AS imageUrl, p.price_from AS priceFrom, p.price_to AS priceTo,
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
              image_url AS imageUrl, price_from AS priceFrom, price_to AS priceTo
       FROM agent_projects WHERE id = ? AND is_active = 1 LIMIT 1`,
      [id],
    );
    return rows[0] || null;
  },

  // Units an agent can act on: available (and held, so they see what's on hold).
  async listUnits(projectId, { status } = {}) {
    const where = ['u.project_id = ?'];
    const params = [projectId];
    if (status) { where.push('u.status = ?'); params.push(status); }
    else { where.push("u.status IN ('available','held')"); }
    const [rows] = await pool.query(
      `SELECT u.id, u.tower_id AS towerId, t.name AS towerName, u.unit_no AS unitNo,
              u.floor, u.unit_type AS unitType, u.area_sqft AS areaSqft,
              u.base_price AS basePrice, u.facing, u.status, u.hold_until AS holdUntil,
              u.held_by_agent_id AS heldByAgentId
       FROM units u
       LEFT JOIN project_towers t ON t.id = u.tower_id
       WHERE ${where.join(' AND ')}
       ORDER BY u.sort_order ASC, u.id ASC`,
      params,
    );
    return rows;
  },
};

module.exports = AgentProjectModel;
