// Straight-line distance (km) between two lat/lng points. Good enough for fare
// previews; swap for a Distance-Matrix call later if needed.
function haversineKm(a, b) {
  if (!a || !b || a.lat == null || a.lng == null || b.lat == null || b.lng == null) return 0;
  const R = 6371;
  const toRad = d => (Number(d) * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

// Fare = max(minFare, baseFare + perKm * billableKm) * surge (+ nightCharge at night).
function computeFare(vehicle, distanceKm, rules, atDate = new Date()) {
  const freeKm = Number(rules?.free_km || 0);
  const billable = Math.max(0, distanceKm - freeKm);
  let fare = Number(vehicle.base_fare) + Number(vehicle.per_km) * billable;
  fare = Math.max(fare, Number(rules?.min_fare || 0));
  fare = fare * Number(rules?.surge_multiplier || 1);
  const hour = atDate.getHours();
  const ns = Number(rules?.night_start_hour ?? 22);
  const ne = Number(rules?.night_end_hour ?? 5);
  const isNight = ns > ne ? hour >= ns || hour < ne : hour >= ns && hour < ne;
  if (isNight) fare += Number(rules?.night_charge || 0);
  return Math.round(fare);
}

module.exports = { haversineKm, computeFare };
