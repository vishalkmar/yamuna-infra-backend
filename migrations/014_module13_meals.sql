-- =========================================================================
-- Module 13 — Meal Ordering Service
--   • meal_menu_items     — daily tiffin / prasadam menu
--   • meal_orders         — one-time meal orders
--   • meal_subscriptions  — daily/weekly/monthly tiffin plans
-- =========================================================================

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS meal_menu_items (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  meal_type  ENUM('breakfast','lunch','dinner','prasadam') NOT NULL,
  name       VARCHAR(150)    NOT NULL,
  diet_type  ENUM('satvik','jain','regular_veg') NOT NULL DEFAULT 'regular_veg',
  price      DECIMAL(8,2)    NOT NULL DEFAULT 0,
  available  TINYINT(1)      NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_menu_type (meal_type, available)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS meal_orders (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  meal_date     DATE            NOT NULL,
  meal_types    VARCHAR(80)     NOT NULL,             -- CSV: breakfast,lunch,dinner,prasadam
  diet_type     ENUM('satvik','jain','regular_veg','custom') NOT NULL DEFAULT 'regular_veg',
  persons       INT             NOT NULL DEFAULT 1,
  delivery_note VARCHAR(150)    NULL,
  status        ENUM('placed','preparing','delivered','cancelled') NOT NULL DEFAULT 'placed',
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_morder_user (user_id, meal_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS meal_subscriptions (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  plan          ENUM('daily','weekly','monthly') NOT NULL,
  diet_type     ENUM('satvik','jain','regular_veg','custom') NOT NULL DEFAULT 'regular_veg',
  persons       INT             NOT NULL DEFAULT 1,
  start_date    DATE            NOT NULL,
  next_renewal  DATE            NULL,
  status        ENUM('active','paused','cancelled') NOT NULL DEFAULT 'active',
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_msub_user (user_id, status)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================================
-- SEED — menu
-- =========================================================================

INSERT INTO meal_menu_items (meal_type, name, diet_type, price, available)
SELECT src.meal_type, src.name, src.diet_type, src.price, 1 FROM (
  SELECT 'breakfast' AS meal_type, 'Poha & Chai'              AS name, 'satvik'      AS diet_type, 60.00  AS price UNION ALL
  SELECT 'breakfast',              'Aloo Paratha (2) + Curd',        'regular_veg',               80.00  UNION ALL
  SELECT 'breakfast',              'Sabudana Khichdi',               'jain',                      70.00  UNION ALL
  SELECT 'lunch',                  'Satvik Thali',                   'satvik',                    150.00 UNION ALL
  SELECT 'lunch',                  'Regular Veg Thali',              'regular_veg',               140.00 UNION ALL
  SELECT 'lunch',                  'Jain Thali',                     'jain',                      160.00 UNION ALL
  SELECT 'dinner',                 'Khichdi & Kadhi',                'satvik',                    120.00 UNION ALL
  SELECT 'dinner',                 'Roti-Sabzi-Dal',                 'regular_veg',               130.00 UNION ALL
  SELECT 'prasadam',               'Panchamrit & Prasad Box',        'satvik',                    100.00
) src
WHERE NOT EXISTS (SELECT 1 FROM meal_menu_items m WHERE m.name = src.name AND m.meal_type = src.meal_type);
