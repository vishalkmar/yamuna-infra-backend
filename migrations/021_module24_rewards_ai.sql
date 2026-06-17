-- =========================================================================
-- Modules 24–26 — Resident Benefits, Investments & AI Concierge
--   • reward_offers / reward_ledger — loyalty redemptions
--   • investment_projects — new project opportunities
--   • medication_reminders / companion_checkins / ai_messages — Vrindavan Companion
--   (reward_accounts + referrals exist in 001)
-- =========================================================================

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS reward_offers (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title       VARCHAR(150)    NOT NULL,
  partner     VARCHAR(120)    NULL,
  description VARCHAR(300)    NULL,
  points_cost INT             NOT NULL DEFAULT 0,
  category    VARCHAR(40)     NULL,
  active      TINYINT(1)      NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reward_ledger (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL,
  points     INT             NOT NULL,          -- negative = redeemed
  reason     VARCHAR(150)    NOT NULL,
  created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ledger_user (user_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS investment_projects (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code        VARCHAR(20)     NOT NULL,
  name        VARCHAR(150)    NOT NULL,
  location    VARCHAR(120)    NULL,
  price_from  DECIMAL(14,2)   NULL,
  status      ENUM('pre_launch','launching','open') NOT NULL DEFAULT 'open',
  description VARCHAR(400)    NULL,
  image_url   VARCHAR(500)    NULL,
  active      TINYINT(1)      NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uk_invest_code (code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS medication_reminders (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL,
  medicine   VARCHAR(120)    NOT NULL,
  dosage     VARCHAR(80)     NULL,
  time_label VARCHAR(20)     NOT NULL,          -- HH:MM
  active     TINYINT(1)      NOT NULL DEFAULT 1,
  created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_medrem_user (user_id, active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS companion_checkins (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  mood_score  TINYINT         NOT NULL,
  health_note VARCHAR(200)    NULL,
  activities  VARCHAR(160)    NULL,             -- CSV
  pain_level  TINYINT         NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_checkin_user (user_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ai_messages (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL,
  role       ENUM('user','assistant') NOT NULL,
  content    VARCHAR(1000)   NOT NULL,
  created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_aimsg_user (user_id, id)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================================
-- SEED
-- =========================================================================

INSERT INTO reward_offers (title, partner, description, points_cost, category, active)
SELECT src.title, src.partner, src.descr, src.cost, src.cat, 1 FROM (
  SELECT 'Wellness Spa — 20% off' AS title, 'Yamuna Wellness'  AS partner, 'Flat 20% off any Ayurvedic therapy' AS descr, 500 AS cost, 'wellness' AS cat UNION ALL
  SELECT 'Dining voucher ₹500',         'Brij Rasoi',                'Use at the clubhouse restaurant',           300,        'dining' UNION ALL
  SELECT 'Movie tickets (2)',           'PVR Mathura',               'Two tickets, any show',                     400,        'entertainment' UNION ALL
  SELECT 'Grocery 10% cashback',        'DailyNeeds Mart',           'On orders above ₹1000',                     200,        'grocery' UNION ALL
  SELECT 'Salon & grooming ₹400 off',   'GlowUp Salon',              'On services above ₹1500',                   350,        'lifestyle'
) src
WHERE NOT EXISTS (SELECT 1 FROM reward_offers o WHERE o.title = src.title);

INSERT INTO investment_projects (code, name, location, price_from, status, description, image_url, active)
SELECT src.code, src.name, src.loc, src.price, src.status, src.descr, src.img, 1 FROM (
  SELECT 'VG'  AS code, 'Vrindavan Greens'   AS name, 'Chhatikara Road, Vrindavan' AS loc, 4500000.00  AS price, 'pre_launch' AS status, '2 & 3 BHK premium apartments near ISKCON' AS descr, 'https://picsum.photos/seed/vg/800/450' AS img UNION ALL
  SELECT 'YR',         'Yamuna Riverside',          'Mathura Road, Vrindavan',          7800000.00,        'launching',          'Riverside villas with private ghats',           'https://picsum.photos/seed/yr/800/450' UNION ALL
  SELECT 'GR',         'Gokul Residency',           'Gokul, Mathura',                   3200000.00,        'open',               'Affordable 1 & 2 BHK for investors',            'https://picsum.photos/seed/gr/800/450'
) src
WHERE NOT EXISTS (SELECT 1 FROM investment_projects p WHERE p.code = src.code);
