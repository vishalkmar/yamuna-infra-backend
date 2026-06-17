-- =========================================================================
-- Admin Portal — Module A8: Wellness & Spiritual
--   Wellness: enrich `wellness_therapies` (image, duration, category, sort).
--   Spiritual: create `spiritual_services` (puja/seva catalog) — was mock-only
--   in the app. wellness_bookings already exists.
-- =========================================================================

ALTER TABLE wellness_therapies
  ADD COLUMN image_url    VARCHAR(255) NULL AFTER icon,
  ADD COLUMN duration_min INT          NOT NULL DEFAULT 60 AFTER price,
  ADD COLUMN category     VARCHAR(60)  NULL AFTER duration_min,
  ADD COLUMN sort_order   INT          NOT NULL DEFAULT 0 AFTER active;

CREATE TABLE IF NOT EXISTS spiritual_services (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(150)    NOT NULL,
  icon       VARCHAR(40)     NULL,
  image_url  VARCHAR(255)    NULL,
  price      DECIMAL(10,2)   NOT NULL DEFAULT 0,
  notes      VARCHAR(500)    NULL,
  is_active  TINYINT(1)      NOT NULL DEFAULT 1,
  sort_order INT             NOT NULL DEFAULT 0,
  created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- ----- Seed spiritual services -----
INSERT INTO spiritual_services (name, icon, price, notes, sort_order)
SELECT s.name, s.icon, s.price, s.notes, s.so FROM (
  SELECT 'Satyanarayan Puja' AS name, '🪔' AS icon, 2100 AS price, 'Includes pandit, samagri & prasad' AS notes, 1 AS so UNION ALL
  SELECT 'Rudrabhishek',              '🕉️', 1100, 'Shiva abhishek with milk, honey & bel patra', 2 UNION ALL
  SELECT 'Griha Pravesh Puja',        '🏠', 5100, 'Housewarming ceremony with havan',          3 UNION ALL
  SELECT 'Navagraha Shanti',          '🌟', 3100, 'Nine-planet peace puja',                     4 UNION ALL
  SELECT 'Mundan Sanskar',            '👶', 1500, 'First haircut ceremony',                     5
) s
WHERE NOT EXISTS (SELECT 1 FROM spiritual_services x WHERE x.name = s.name);
