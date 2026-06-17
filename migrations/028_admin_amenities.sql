-- =========================================================================
-- Admin Portal — Module A11: Amenities & Clubhouse
--   `amenities` was flat (code/name/icon/capacity/deposit/active). Adds the
--   richer fields (image, hourly rate, location, features, description, slot
--   config) + an amenity_categories table. blackouts/bookings tables exist.
-- =========================================================================

CREATE TABLE IF NOT EXISTS amenity_categories (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code       VARCHAR(40)     NOT NULL,
  name       VARCHAR(120)    NOT NULL,
  icon       VARCHAR(40)     NULL,
  image_url  VARCHAR(255)    NULL,
  is_active  TINYINT(1)      NOT NULL DEFAULT 1,
  sort_order INT             NOT NULL DEFAULT 0,
  created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_amenity_categories_code (code)
) ENGINE=InnoDB;

ALTER TABLE amenities
  ADD COLUMN category_id  BIGINT UNSIGNED NULL AFTER id,
  ADD COLUMN image_url    VARCHAR(255)    NULL AFTER icon,
  ADD COLUMN hourly_rate  DECIMAL(10,2)   NOT NULL DEFAULT 0 AFTER deposit,
  ADD COLUMN location     VARCHAR(150)    NULL AFTER hourly_rate,
  ADD COLUMN features     VARCHAR(300)    NULL AFTER location,
  ADD COLUMN description  VARCHAR(500)    NULL AFTER features,
  ADD COLUMN open_time    TIME            NULL AFTER description,
  ADD COLUMN close_time   TIME            NULL AFTER open_time,
  ADD COLUMN slot_minutes INT             NOT NULL DEFAULT 120 AFTER close_time,
  ADD COLUMN sort_order   INT             NOT NULL DEFAULT 0 AFTER slot_minutes;

-- ----- Seed amenity categories -----
INSERT INTO amenity_categories (code, name, icon, sort_order)
SELECT s.code, s.name, s.icon, s.so FROM (
  SELECT 'halls'   AS code, 'Halls'         AS name, '🏛️' AS icon, 1 AS so UNION ALL
  SELECT 'fitness',        'Yoga / Fitness',       '🧘', 2 UNION ALL
  SELECT 'sports',         'Courts & Sports',      '🏸', 3 UNION ALL
  SELECT 'pools',          'Pools',                '🏊', 4 UNION ALL
  SELECT 'lawns',          'Lawns & Gardens',      '🌳', 5
) s
WHERE NOT EXISTS (SELECT 1 FROM amenity_categories c WHERE c.code = s.code);
