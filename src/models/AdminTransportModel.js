const { pool } = require('../config/db');

const AdminTransportModel = {
  // ---------- Vehicle types ----------
  async listVehicles() {
    const [rows] = await pool.query(
      `SELECT id, code, label, icon, image_url AS imageUrl, capacity, base_fare AS baseFare,
              per_km AS perKm, eta_minutes AS etaMinutes, is_active AS isActive, sort_order AS sortOrder
       FROM vehicle_types ORDER BY sort_order ASC, id ASC`,
    );
    return rows;
  },

  async createVehicle(d) {
    const [r] = await pool.query(
      `INSERT INTO vehicle_types (code, label, icon, image_url, capacity, base_fare, per_km, eta_minutes, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.code, d.label, d.icon || null, d.imageUrl || null, d.capacity || 4, d.baseFare || 0,
       d.perKm || 0, d.etaMinutes || 5, d.isActive ? 1 : 0, d.sortOrder || 0],
    );
    return { id: r.insertId };
  },

  async updateVehicle(id, d) {
    const [r] = await pool.query(
      `UPDATE vehicle_types SET label = ?, icon = ?, image_url = ?, capacity = ?, base_fare = ?,
              per_km = ?, eta_minutes = ?, is_active = ?, sort_order = ? WHERE id = ?`,
      [d.label, d.icon || null, d.imageUrl || null, d.capacity || 4, d.baseFare || 0,
       d.perKm || 0, d.etaMinutes || 5, d.isActive ? 1 : 0, d.sortOrder || 0, id],
    );
    return r.affectedRows > 0;
  },

  async deleteVehicle(id) {
    const [r] = await pool.query(`DELETE FROM vehicle_types WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  },

  // ---------- Places ----------
  async listPlaces() {
    const [rows] = await pool.query(
      `SELECT id, name, area, lat, lng, is_temple AS isTemple, is_active AS isActive, sort_order AS sortOrder
       FROM transport_places ORDER BY sort_order ASC, id ASC`,
    );
    return rows;
  },

  async createPlace(d) {
    const [r] = await pool.query(
      `INSERT INTO transport_places (name, area, lat, lng, is_temple, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [d.name, d.area || null, d.lat, d.lng, d.isTemple ? 1 : 0, d.isActive ? 1 : 0, d.sortOrder || 0],
    );
    return { id: r.insertId };
  },

  async updatePlace(id, d) {
    const [r] = await pool.query(
      `UPDATE transport_places SET name = ?, area = ?, lat = ?, lng = ?, is_temple = ?, is_active = ?, sort_order = ? WHERE id = ?`,
      [d.name, d.area || null, d.lat, d.lng, d.isTemple ? 1 : 0, d.isActive ? 1 : 0, d.sortOrder || 0, id],
    );
    return r.affectedRows > 0;
  },

  async deletePlace(id) {
    const [r] = await pool.query(`DELETE FROM transport_places WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  },

  // ---------- Fare rules (single config row) ----------
  async getFareRules() {
    const [rows] = await pool.query(
      `SELECT id, surge_multiplier AS surgeMultiplier, min_fare AS minFare, night_charge AS nightCharge,
              free_km AS freeKm, night_start_hour AS nightStartHour, night_end_hour AS nightEndHour
       FROM fare_rules WHERE id = 1 LIMIT 1`,
    );
    return rows[0] || null;
  },

  async updateFareRules(d) {
    await pool.query(
      `UPDATE fare_rules SET surge_multiplier = ?, min_fare = ?, night_charge = ?, free_km = ?,
              night_start_hour = ?, night_end_hour = ? WHERE id = 1`,
      [d.surgeMultiplier, d.minFare, d.nightCharge, d.freeKm, d.nightStartHour, d.nightEndHour],
    );
    return this.getFareRules();
  },

  // ---------- Rides (read + status) ----------
  async listRides({ status, page = 1, pageSize = 20 } = {}) {
    const where = ['1=1'];
    const params = [];
    if (status) { where.push('r.status = ?'); params.push(status); }
    const whereSql = where.join(' AND ');
    const [cnt] = await pool.query(`SELECT COUNT(*) AS total FROM rides r WHERE ${whereSql}`, params);
    const limit = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
    const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;
    const [rows] = await pool.query(
      `SELECT r.id, r.ride_code AS rideCode, r.pickup_name AS pickupName, r.drop_name AS dropName,
              r.distance_km AS distanceKm, r.fare, r.eta_minutes AS etaMinutes, r.status, r.created_at AS createdAt,
              v.label AS vehicleLabel, v.icon AS vehicleIcon,
              u.name AS userName, u.mobile AS userMobile
       FROM rides r
       LEFT JOIN vehicle_types v ON v.id = r.vehicle_type_id
       LEFT JOIN users u ON u.id = r.user_id
       WHERE ${whereSql}
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { rows, total: cnt[0].total, page: Math.max(parseInt(page, 10) || 1, 1), pageSize: limit };
  },

  async updateRideStatus(id, status) {
    const [r] = await pool.query(`UPDATE rides SET status = ? WHERE id = ?`, [status, id]);
    return r.affectedRows > 0;
  },
};

module.exports = AdminTransportModel;
