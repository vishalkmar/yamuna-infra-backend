-- =========================================================================
-- Admin Portal — Module A10: Transport (Cabs / Auto / Bus) — Ola/Uber-style
--   The app's transport module (Module 34) was fully mock-only. This creates
--   the real schema and seeds vehicle types + Vrindavan/Mathura places so the
--   app's TransportScreen can read live fares/options once wired.
-- =========================================================================

CREATE TABLE IF NOT EXISTS vehicle_types (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code        VARCHAR(40)     NOT NULL,
  label       VARCHAR(80)     NOT NULL,
  icon        VARCHAR(40)     NULL,
  image_url   VARCHAR(255)    NULL,
  capacity    INT             NOT NULL DEFAULT 4,
  base_fare   DECIMAL(8,2)    NOT NULL DEFAULT 0,
  per_km      DECIMAL(8,2)    NOT NULL DEFAULT 0,
  eta_minutes INT             NOT NULL DEFAULT 5,
  is_active   TINYINT(1)      NOT NULL DEFAULT 1,
  sort_order  INT             NOT NULL DEFAULT 0,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_vehicle_types_code (code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS transport_places (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(150)    NOT NULL,
  area       VARCHAR(120)    NULL,
  lat        DECIMAL(10,7)   NOT NULL,
  lng        DECIMAL(10,7)   NOT NULL,
  is_temple  TINYINT(1)      NOT NULL DEFAULT 0,
  is_active  TINYINT(1)      NOT NULL DEFAULT 1,
  sort_order INT             NOT NULL DEFAULT 0,
  created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_transport_places_active (is_active)
) ENGINE=InnoDB;

-- Single global fare-rules row (id = 1).
CREATE TABLE IF NOT EXISTS fare_rules (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  surge_multiplier DECIMAL(3,2)    NOT NULL DEFAULT 1.00,
  min_fare         DECIMAL(8,2)    NOT NULL DEFAULT 30,
  night_charge     DECIMAL(8,2)    NOT NULL DEFAULT 0,
  free_km          DECIMAL(4,1)    NOT NULL DEFAULT 0,
  night_start_hour INT             NOT NULL DEFAULT 22,
  night_end_hour   INT             NOT NULL DEFAULT 5,
  updated_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS rides (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ride_code       VARCHAR(20)     NOT NULL,
  user_id         BIGINT UNSIGNED NOT NULL,
  vehicle_type_id BIGINT UNSIGNED NULL,
  pickup_name     VARCHAR(150)    NOT NULL,
  pickup_lat      DECIMAL(10,7)   NULL,
  pickup_lng      DECIMAL(10,7)   NULL,
  drop_name       VARCHAR(150)    NOT NULL,
  drop_lat        DECIMAL(10,7)   NULL,
  drop_lng        DECIMAL(10,7)   NULL,
  distance_km     DECIMAL(6,1)    NOT NULL DEFAULT 0,
  fare            DECIMAL(8,2)    NOT NULL DEFAULT 0,
  eta_minutes     INT             NOT NULL DEFAULT 0,
  status          ENUM('requested','confirmed','ongoing','completed','cancelled') NOT NULL DEFAULT 'requested',
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_rides_code (ride_code),
  KEY idx_rides_user (user_id),
  KEY idx_rides_status (status)
) ENGINE=InnoDB;

-- ----- Seed fare rules -----
INSERT INTO fare_rules (id, surge_multiplier, min_fare, night_charge, free_km)
SELECT 1, 1.00, 30, 20, 0
WHERE NOT EXISTS (SELECT 1 FROM fare_rules WHERE id = 1);

-- ----- Seed vehicle types -----
INSERT INTO vehicle_types (code, label, icon, capacity, base_fare, per_km, eta_minutes, sort_order)
SELECT s.code, s.label, s.icon, s.cap, s.base, s.perkm, s.eta, s.so FROM (
  SELECT 'auto'   AS code, 'Auto'        AS label, '🛺' AS icon, 3  AS cap, 20 AS base, 12 AS perkm, 4  AS eta, 1 AS so UNION ALL
  SELECT 'mini',          'Mini',              '🚗', 4,  40, 15, 6,  2 UNION ALL
  SELECT 'sedan',         'Sedan',             '🚙', 4,  60, 18, 8,  3 UNION ALL
  SELECT 'bus',           'Shared Bus',        '🚌', 20, 15, 5,  12, 4
) s
WHERE NOT EXISTS (SELECT 1 FROM vehicle_types v WHERE v.code = s.code);

-- ----- Seed Vrindavan / Mathura places (with coords) -----
INSERT INTO transport_places (name, area, lat, lng, is_temple, sort_order)
SELECT s.name, s.area, s.lat, s.lng, s.temple, s.so FROM (
  SELECT 'Banke Bihari Temple'        AS name, 'Vrindavan' AS area, 27.5650 AS lat, 77.6590 AS lng, 1 AS temple, 1 AS so UNION ALL
  SELECT 'Prem Mandir',                      'Vrindavan', 27.5810, 77.6730, 1, 2 UNION ALL
  SELECT 'ISKCON Vrindavan',                 'Vrindavan', 27.5720, 77.6600, 1, 3 UNION ALL
  SELECT 'Radha Raman Temple',               'Vrindavan', 27.5790, 77.7010, 1, 4 UNION ALL
  SELECT 'Vrindavan Bus Stand',              'Vrindavan', 27.5780, 77.6920, 0, 5 UNION ALL
  SELECT 'Mathura Junction',                 'Mathura',   27.4920, 77.6730, 0, 6 UNION ALL
  SELECT 'Krishna Janmabhoomi',              'Mathura',   27.5050, 77.6700, 1, 7 UNION ALL
  SELECT 'Dwarkadhish Temple',               'Mathura',   27.5040, 77.6840, 1, 8
) s
WHERE NOT EXISTS (SELECT 1 FROM transport_places p WHERE p.name = s.name);
