-- =========================================================================
-- Module 16 — Wheelchair & Mobility Assistance
--   • mobility_aids      — rentable / buyable mobility equipment (seeded)
--   • mobility_bookings  — rent/buy bookings, optional trained attendant
-- =========================================================================

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS mobility_aids (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code                VARCHAR(20)     NOT NULL,
  name                VARCHAR(120)    NOT NULL,
  category            ENUM('wheelchair','walker','scooter','support','bed') NOT NULL,
  description         VARCHAR(200)    NULL,
  rent_per_day        DECIMAL(8,2)    NOT NULL DEFAULT 0,
  buy_price           DECIMAL(10,2)   NULL,
  attendant_available TINYINT(1)      NOT NULL DEFAULT 0,
  active              TINYINT(1)      NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uk_mobility_code (code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS mobility_bookings (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        BIGINT UNSIGNED NOT NULL,
  aid_id         BIGINT UNSIGNED NOT NULL,
  mode           ENUM('rent','buy') NOT NULL DEFAULT 'rent',
  start_date     DATE            NOT NULL,
  days           INT             NOT NULL DEFAULT 1,
  with_attendant TINYINT(1)      NOT NULL DEFAULT 0,
  delivery_note  VARCHAR(150)    NULL,
  total          DECIMAL(10,2)   NOT NULL DEFAULT 0,
  status         ENUM('requested','confirmed','active','returned','cancelled') NOT NULL DEFAULT 'confirmed',
  created_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_mob_booking_user (user_id, start_date),
  CONSTRAINT fk_mob_aid FOREIGN KEY (aid_id) REFERENCES mobility_aids(id)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================================
-- SEED — mobility aids
-- =========================================================================

INSERT INTO mobility_aids (code, name, category, description, rent_per_day, buy_price, attendant_available, active)
SELECT src.code, src.name, src.category, src.descr, src.rent, src.buy, src.att, 1 FROM (
  SELECT 'WC-M' AS code, 'Manual Wheelchair'        AS name, 'wheelchair' AS category, 'Foldable, lightweight'         AS descr, 150.00 AS rent, 6500.00  AS buy, 1 AS att UNION ALL
  SELECT 'WC-E',         'Electric Wheelchair',            'wheelchair',               'Battery powered, joystick',              400.00,        35000.00,       1 UNION ALL
  SELECT 'SCO',          'Mobility Scooter',               'scooter',                  '4-wheel, long range',                    500.00,        45000.00,       0 UNION ALL
  SELECT 'WLK',          'Foldable Walker',                'walker',                   'Height adjustable',                      50.00,         1800.00,        0 UNION ALL
  SELECT 'STK',          'Adjustable Walking Stick',       'support',                  'Anti-slip base',                         20.00,         600.00,         0 UNION ALL
  SELECT 'COM',          'Commode Chair',                  'support',                  'With armrests',                          60.00,         2200.00,        0 UNION ALL
  SELECT 'BED',          'Hospital Bed (Manual)',          'bed',                      'Adjustable head/leg, side rails',        300.00,        22000.00,       1
) src
WHERE NOT EXISTS (SELECT 1 FROM mobility_aids a WHERE a.code = src.code);
