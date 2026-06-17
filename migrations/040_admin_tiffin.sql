-- =========================================================================
-- Task 6 — Food: admin-managed Tiffin Plans.
--   tiffin_plans is the catalog the app shows; meal_subscriptions stays the
--   per-resident subscription record (which now references a plan).
-- =========================================================================

CREATE TABLE IF NOT EXISTS tiffin_plans (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code          VARCHAR(40)     NOT NULL,
  name          VARCHAR(150)    NOT NULL,
  description   VARCHAR(400)    NULL,
  image_url     VARCHAR(255)    NULL,
  period        ENUM('daily','weekly','monthly') NOT NULL DEFAULT 'monthly',
  price         DECIMAL(10,2)   NOT NULL DEFAULT 0,
  meals_per_day INT             NOT NULL DEFAULT 2,
  meals_included VARCHAR(120)   NULL,
  diet_type     ENUM('satvik','jain','regular_veg','custom') NOT NULL DEFAULT 'satvik',
  is_active     TINYINT(1)      NOT NULL DEFAULT 1,
  sort_order    INT             NOT NULL DEFAULT 0,
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_tiffin_plans_code (code)
) ENGINE=InnoDB;

-- Link subscriptions to a plan (optional; existing rows stay NULL).
ALTER TABLE meal_subscriptions
  ADD COLUMN plan_id BIGINT UNSIGNED NULL AFTER user_id;

-- ----- Seed starter tiffin plans -----
INSERT INTO tiffin_plans (code, name, description, period, price, meals_per_day, meals_included, diet_type, sort_order)
SELECT s.code, s.name, s.descr, s.period, s.price, s.mpd, s.meals, s.diet, s.so FROM (
  SELECT 'satvik_monthly' AS code, 'Satvik Monthly Tiffin' AS name, 'Pure satvik lunch + dinner, home-style, delivered daily' AS descr, 'monthly' AS period, 4500 AS price, 2 AS mpd, 'lunch,dinner' AS meals, 'satvik' AS diet, 1 AS so UNION ALL
  SELECT 'jain_monthly', 'Jain Monthly Tiffin', 'Jain meals (no onion/garlic), lunch + dinner', 'monthly', 5000, 2, 'lunch,dinner', 'jain', 2 UNION ALL
  SELECT 'lunch_weekly', 'Weekly Lunch Plan', 'Lunch only, 6 days a week', 'weekly', 1200, 1, 'lunch', 'regular_veg', 3
) s
WHERE NOT EXISTS (SELECT 1 FROM tiffin_plans p WHERE p.code = s.code);
