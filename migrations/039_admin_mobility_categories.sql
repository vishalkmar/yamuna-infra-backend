-- =========================================================================
-- Task 1 — Mobility Aids: admin-managed categories (was a fixed ENUM).
--   Creates mobility_categories, relaxes mobility_aids.category to VARCHAR and
--   links category_id. Existing rows are mapped by their old enum value.
-- =========================================================================

CREATE TABLE IF NOT EXISTS mobility_categories (
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
  UNIQUE KEY uk_mobility_categories_code (code)
) ENGINE=InnoDB;

-- Seed from the old fixed set.
INSERT INTO mobility_categories (code, name, icon, sort_order)
SELECT s.code, s.name, s.icon, s.so FROM (
  SELECT 'wheelchair' AS code, 'Wheelchairs'   AS name, '🦽' AS icon, 1 AS so UNION ALL
  SELECT 'walker',            'Walkers',              '🚶', 2 UNION ALL
  SELECT 'scooter',           'Scooters',             '🛵', 3 UNION ALL
  SELECT 'support',           'Support Aids',         '🦯', 4 UNION ALL
  SELECT 'bed',               'Beds & Furniture',     '🛏️', 5
) s
WHERE NOT EXISTS (SELECT 1 FROM mobility_categories c WHERE c.code = s.code);

-- Relax the enum to a free string + add the FK-ish link.
ALTER TABLE mobility_aids
  MODIFY COLUMN category VARCHAR(40) NULL,
  ADD COLUMN category_id BIGINT UNSIGNED NULL AFTER category;

UPDATE mobility_aids ma
JOIN mobility_categories mc ON mc.code = ma.category
SET ma.category_id = mc.id
WHERE ma.category_id IS NULL;
