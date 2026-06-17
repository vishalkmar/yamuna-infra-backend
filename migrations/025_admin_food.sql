-- =========================================================================
-- Admin Portal — Module A5: Food Ordering (in-app food app)
--   The app's food module (categories → items → cart → order) was mock-only.
--   This creates the real catalog + orders so the admin runs it dynamically.
--   Also seeds starter categories and migrates the 9 legacy meal_menu_items
--   into food_items so there's content immediately.
-- =========================================================================

CREATE TABLE IF NOT EXISTS food_categories (
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
  UNIQUE KEY uk_food_categories_code (code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS food_items (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id BIGINT UNSIGNED NOT NULL,
  name        VARCHAR(150)    NOT NULL,
  description VARCHAR(400)    NULL,
  image_url   VARCHAR(255)    NULL,
  price       DECIMAL(8,2)    NOT NULL DEFAULT 0,
  is_veg      TINYINT(1)      NOT NULL DEFAULT 1,
  rating      DECIMAL(2,1)    NOT NULL DEFAULT 0,
  is_active   TINYINT(1)      NOT NULL DEFAULT 1,
  sold_out    TINYINT(1)      NOT NULL DEFAULT 0,
  sort_order  INT             NOT NULL DEFAULT 0,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_food_items_category (category_id),
  CONSTRAINT fk_food_items_category FOREIGN KEY (category_id)
    REFERENCES food_categories (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS food_orders (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  total         DECIMAL(10,2)   NOT NULL DEFAULT 0,
  delivery_note VARCHAR(150)    NULL,
  status        ENUM('placed','preparing','out_for_delivery','delivered','cancelled')
                                NOT NULL DEFAULT 'placed',
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_food_orders_user (user_id),
  KEY idx_food_orders_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS food_order_items (
  id       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  item_id  BIGINT UNSIGNED NULL,
  name     VARCHAR(150)    NOT NULL,
  price    DECIMAL(8,2)    NOT NULL DEFAULT 0,
  qty      INT             NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_food_order_items_order (order_id),
  CONSTRAINT fk_food_order_items_order FOREIGN KEY (order_id)
    REFERENCES food_orders (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----- Seed starter categories -----
INSERT INTO food_categories (code, name, icon, sort_order)
SELECT s.code, s.name, s.icon, s.so FROM (
  SELECT 'breakfast' AS code, 'Breakfast'  AS name, '🍳' AS icon, 1 AS so UNION ALL
  SELECT 'lunch',             'Lunch Thali',       '🍱', 2 UNION ALL
  SELECT 'dinner',            'Dinner',            '🍽️', 3 UNION ALL
  SELECT 'snacks',            'Snacks',            '🍿', 4 UNION ALL
  SELECT 'beverages',         'Beverages',         '🍵', 5 UNION ALL
  SELECT 'sweets',            'Sweets',            '🍰', 6 UNION ALL
  SELECT 'prasadam',          'Prasadam',          '🪔', 7
) s
WHERE NOT EXISTS (SELECT 1 FROM food_categories fc WHERE fc.code = s.code);

-- ----- Migrate legacy meal_menu_items into food_items -----
INSERT INTO food_items (category_id, name, price, is_veg, rating, is_active)
SELECT fc.id, mi.name, mi.price, 1, 4.5, mi.available
FROM meal_menu_items mi
JOIN food_categories fc ON fc.code = mi.meal_type
WHERE NOT EXISTS (
  SELECT 1 FROM food_items fi WHERE fi.name = mi.name AND fi.category_id = fc.id
);
