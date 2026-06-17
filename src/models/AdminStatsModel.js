const { pool } = require('../config/db');

// Map a range key to a SQL boolean on a `created_at` column.
function rangeWhere(col, range) {
  if (range === 'today') return `${col} >= CURDATE()`;
  const days = range === '30d' ? 30 : 7;
  return `${col} >= (NOW() - INTERVAL ${days} DAY)`;
}

async function scalar(sql, params = []) {
  const [[row]] = await pool.query(sql, params);
  return Number(Object.values(row)[0] || 0);
}

const AdminStatsModel = {
  async overview(range = '7d') {
    const fo = rangeWhere('created_at', range);
    const rd = rangeWhere('created_at', range);
    const sb = rangeWhere('created_at', range);
    const ap = rangeWhere('created_at', range);
    const us = rangeWhere('created_at', range);

    const [
      residents, activeResidents, kycPending, providers, doctors, openSos,
      newResidents, ordersInRange, foodRevenue, ridesInRange, rideRevenue,
      appts, serviceBookings,
    ] = await Promise.all([
      scalar(`SELECT COUNT(*) FROM users`),
      scalar(`SELECT COUNT(*) FROM users WHERE is_active = 1`),
      scalar(`SELECT COUNT(*) FROM users WHERE kyc_status = 'pending'`),
      scalar(`SELECT COUNT(*) FROM service_providers WHERE active = 1`),
      scalar(`SELECT COUNT(*) FROM doctors WHERE active = 1`),
      scalar(`SELECT COUNT(*) FROM sos_requests WHERE status IN ('active','dispatched')`),
      scalar(`SELECT COUNT(*) FROM users WHERE ${us}`),
      scalar(`SELECT COUNT(*) FROM food_orders WHERE ${fo}`),
      scalar(`SELECT COALESCE(SUM(total),0) FROM food_orders WHERE ${fo} AND status <> 'cancelled'`),
      scalar(`SELECT COUNT(*) FROM rides WHERE ${rd}`),
      scalar(`SELECT COALESCE(SUM(fare),0) FROM rides WHERE ${rd} AND status <> 'cancelled'`),
      scalar(`SELECT COUNT(*) FROM healthcare_appointments WHERE ${ap}`),
      scalar(`SELECT COUNT(*) FROM service_bookings WHERE ${sb}`),
    ]);

    return {
      range,
      residents, activeResidents, kycPending, providers, doctors, openSos,
      newResidents, ordersInRange, ridesInRange, appointments: appts, serviceBookings,
      revenue: foodRevenue + rideRevenue,
      foodRevenue, rideRevenue,
    };
  },

  // Orders per day over the range (food_orders) for a simple chart.
  async timeseries(range = '7d') {
    const days = range === '30d' ? 30 : range === 'today' ? 1 : 7;
    const [rows] = await pool.query(
      `SELECT DATE(created_at) AS day, COUNT(*) AS count
       FROM food_orders
       WHERE created_at >= (CURDATE() - INTERVAL ? DAY)
       GROUP BY DATE(created_at) ORDER BY day ASC`,
      [days - 1],
    );
    return rows.map(r => ({ date: r.day, count: Number(r.count) }));
  },

  // Latest cross-module activity for the dashboard feed.
  async recentActivity() {
    const [rows] = await pool.query(
      `SELECT * FROM (
        SELECT 'signup' AS kind, u.id AS refId, COALESCE(u.name, u.mobile) AS label, '' AS status, u.created_at AS createdAt
          FROM users u
        UNION ALL
        SELECT 'food', o.id, CONCAT('Food order #', o.id), o.status, o.created_at FROM food_orders o
        UNION ALL
        SELECT 'ride', r.id, CONCAT(r.pickup_name, ' → ', r.drop_name), r.status, r.created_at FROM rides r
        UNION ALL
        SELECT 'service', sb.id, COALESCE(c.name,'Service booking'), sb.status, sb.created_at
          FROM service_bookings sb LEFT JOIN service_categories c ON c.id = sb.category_id
        UNION ALL
        SELECT 'appointment', a.id, CONCAT('Consult: ', a.patient_name), a.status, a.created_at FROM healthcare_appointments a
        UNION ALL
        SELECT 'sos', s.id, s.request_code, s.status, s.created_at FROM sos_requests s
      ) feed
      ORDER BY createdAt DESC
      LIMIT 15`,
    );
    return rows;
  },
};

module.exports = AdminStatsModel;
