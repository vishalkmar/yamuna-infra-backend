-- =========================================================================
-- Task 2 — Wellness: categories → activities (like Food).
--   Creates wellness_categories and links wellness_therapies.category_id.
--   Existing therapies are mapped to seeded categories by name.
-- =========================================================================

CREATE TABLE IF NOT EXISTS wellness_categories (
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
  UNIQUE KEY uk_wellness_categories_code (code)
) ENGINE=InnoDB;

ALTER TABLE wellness_therapies
  ADD COLUMN category_id BIGINT UNSIGNED NULL AFTER id;

INSERT INTO wellness_categories (code, name, icon, sort_order)
SELECT s.code, s.name, s.icon, s.so FROM (
  SELECT 'ayurveda'  AS code, 'Ayurveda Therapy' AS name, '💆' AS icon, 1 AS so UNION ALL
  SELECT 'yoga',             'Yoga',                    '🧘', 2 UNION ALL
  SELECT 'meditation',       'Meditation',              '🕉️', 3 UNION ALL
  SELECT 'spa',              'Spa & Massage',           '🛁', 4 UNION ALL
  SELECT 'detox',            'Detox & Cleanse',         '🌿', 5
) s
WHERE NOT EXISTS (SELECT 1 FROM wellness_categories c WHERE c.code = s.code);

-- Map the existing seeded therapies into categories.
UPDATE wellness_therapies t
JOIN wellness_categories c ON c.code = (
  CASE
    WHEN t.name IN ('Abhyanga','Shirodhara') THEN 'ayurveda'
    WHEN t.name = 'Panchakarma' THEN 'detox'
    WHEN t.name = 'Yoga' THEN 'yoga'
    WHEN t.name = 'Meditation' THEN 'meditation'
    ELSE 'spa'
  END)
SET t.category_id = c.id
WHERE t.category_id IS NULL;
