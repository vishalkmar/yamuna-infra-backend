const { pool } = require('../config/db');
const { haversineKm, computeFare } = require('../utils/geo');

function makeRideCode() {
  return 'RIDE' + Date.now().toString(36).toUpperCase().slice(-6) + Math.floor(Math.random() * 90 + 10);
}

const TransportModel = {
  async listVehicles() {
    const [rows] = await pool.query(
      `SELECT id, code, label, icon, image_url AS imageUrl, capacity, base_fare AS baseFare,
              per_km AS perKm, eta_minutes AS etaMinutes
       FROM vehicle_types WHERE is_active = 1 ORDER BY sort_order ASC, id ASC`,
    );
    return rows;
  },

  async listPlaces(search) {
    const where = ['is_active = 1'];
    const params = [];
    if (search) { where.push('(name LIKE ? OR area LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
    const [rows] = await pool.query(
      `SELECT id, name, area, lat, lng, is_temple AS isTemple
       FROM transport_places WHERE ${where.join(' AND ')}
       ORDER BY sort_order ASC, id ASC LIMIT 50`,
      params,
    );
    return rows;
  },

  async _rules() {
    const [rows] = await pool.query(`SELECT * FROM fare_rules WHERE id = 1 LIMIT 1`);
    return rows[0] || {};
  },

  // Vehicle options with computed fares for a pickup→drop distance.
  async estimate(pickup, drop) {
    const distanceKm = haversineKm(pickup, drop);
    const [vehicles] = await pool.query(
      `SELECT id, code, label, icon, capacity, base_fare AS baseFare, per_km AS perKm, eta_minutes AS etaMinutes
       FROM vehicle_types WHERE is_active = 1 ORDER BY sort_order ASC, id ASC`,
    );
    const rules = await this._rules();
    const options = vehicles.map(v => ({
      vehicleTypeId: v.id, code: v.code, label: v.label, icon: v.icon, capacity: v.capacity,
      etaMinutes: v.etaMinutes,
      fare: computeFare({ base_fare: v.baseFare, per_km: v.perKm }, distanceKm, rules),
    }));
    return { distanceKm, options };
  },

  async book(b) {
    const distanceKm = haversineKm(b.pickup, b.drop);
    const [vrows] = await pool.query(`SELECT base_fare AS baseFare, per_km AS perKm, eta_minutes AS etaMinutes FROM vehicle_types WHERE id = ? AND is_active = 1 LIMIT 1`, [b.vehicleTypeId]);
    const v = vrows[0];
    if (!v) throw new Error('Vehicle type unavailable');
    const rules = await this._rules();
    const fare = computeFare({ base_fare: v.baseFare, per_km: v.perKm }, distanceKm, rules);
    const code = makeRideCode();
    const [r] = await pool.query(
      `INSERT INTO rides
        (ride_code, user_id, vehicle_type_id, pickup_name, pickup_lat, pickup_lng,
         drop_name, drop_lat, drop_lng, distance_km, fare, eta_minutes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'requested')`,
      [code, b.userId, b.vehicleTypeId, b.pickupName, b.pickup?.lat ?? null, b.pickup?.lng ?? null,
       b.dropName, b.drop?.lat ?? null, b.drop?.lng ?? null, distanceKm, fare, v.etaMinutes],
    );
    return { id: r.insertId, rideCode: code, distanceKm, fare, etaMinutes: v.etaMinutes, status: 'requested' };
  },

  async myRides(userId) {
    const [rows] = await pool.query(
      `SELECT r.id, r.ride_code AS rideCode, r.pickup_name AS pickupName, r.drop_name AS dropName,
              r.distance_km AS distanceKm, r.fare, r.eta_minutes AS etaMinutes, r.status, r.created_at AS createdAt,
              v.label AS vehicleLabel, v.icon AS vehicleIcon
       FROM rides r LEFT JOIN vehicle_types v ON v.id = r.vehicle_type_id
       WHERE r.user_id = ? ORDER BY r.created_at DESC, r.id DESC LIMIT 50`,
      [userId],
    );
    return rows;
  },
};

module.exports = TransportModel;
