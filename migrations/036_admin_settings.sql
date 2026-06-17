-- =========================================================================
-- Admin Portal — Module A18: App Settings & Content
--   app_settings    — key/value config (feature flags JSON, content pages).
--   daily_content   — quotes / bhajans / tips rotation shown in the app.
--   reminder_categories — the reminder category list the app offers.
-- =========================================================================

CREATE TABLE IF NOT EXISTS app_settings (
  skey       VARCHAR(60)  NOT NULL,
  svalue     TEXT         NULL,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (skey)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS daily_content (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  kind       ENUM('quote','bhajan','tip') NOT NULL DEFAULT 'quote',
  text       VARCHAR(600)    NOT NULL,
  author     VARCHAR(120)    NULL,
  is_active  TINYINT(1)      NOT NULL DEFAULT 1,
  sort_order INT             NOT NULL DEFAULT 0,
  created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reminder_categories (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code       VARCHAR(40)     NOT NULL,
  name       VARCHAR(120)    NOT NULL,
  icon       VARCHAR(40)     NULL,
  is_active  TINYINT(1)      NOT NULL DEFAULT 1,
  sort_order INT             NOT NULL DEFAULT 0,
  created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_reminder_categories_code (code)
) ENGINE=InnoDB;

-- ----- Seed settings (feature flags + content pages) -----
INSERT INTO app_settings (skey, svalue)
SELECT * FROM (
  SELECT 'feature_flags' AS skey,
         '{"food":true,"transport":true,"healthcare":true,"wellness":true,"mobility":true,"temples":true,"amenities":true,"rewards":true,"community":true}' AS svalue
  UNION ALL SELECT 'page_terms',   'Terms & Conditions — edit in the admin portal.'
  UNION ALL SELECT 'page_privacy', 'Privacy Policy — edit in the admin portal.'
  UNION ALL SELECT 'page_about',   'Yamuna Infra — about the community.'
) s
WHERE NOT EXISTS (SELECT 1 FROM app_settings a WHERE a.skey = s.skey);

-- ----- Seed daily content -----
INSERT INTO daily_content (kind, text, author, sort_order)
SELECT s.kind, s.text, s.author, s.so FROM (
  SELECT 'quote' AS kind, 'Whatever happened, happened for the good.' AS text, 'Bhagavad Gita' AS author, 1 AS so UNION ALL
  SELECT 'quote', 'Change is the law of the universe.', 'Bhagavad Gita', 2 UNION ALL
  SELECT 'bhajan', 'Hare Krishna Hare Krishna, Krishna Krishna Hare Hare', NULL, 3 UNION ALL
  SELECT 'tip', 'Drink warm water in the morning for better digestion.', NULL, 4
) s
WHERE NOT EXISTS (SELECT 1 FROM daily_content d WHERE d.text = s.text);

-- ----- Seed reminder categories -----
INSERT INTO reminder_categories (code, name, icon, sort_order)
SELECT s.code, s.name, s.icon, s.so FROM (
  SELECT 'medicine' AS code, 'Medicine'    AS name, '💊' AS icon, 1 AS so UNION ALL
  SELECT 'water',           'Drink water',        '💧', 2 UNION ALL
  SELECT 'walk',            'Walk / Exercise',    '🚶', 3 UNION ALL
  SELECT 'puja',            'Puja / Aarti',       '🪔', 4 UNION ALL
  SELECT 'appointment',     'Appointment',        '📅', 5
) s
WHERE NOT EXISTS (SELECT 1 FROM reminder_categories r WHERE r.code = s.code);
