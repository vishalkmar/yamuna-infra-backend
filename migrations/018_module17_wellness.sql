-- =========================================================================
-- Module 17 — Ayurvedic Wellness & Spa Booking
--   • wellness_therapies — therapy catalog (Abhyanga, Shirodhara, Panchakarma…)
--   • wellness_bookings  — session/package bookings
-- =========================================================================

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS wellness_therapies (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code         VARCHAR(20)     NOT NULL,
  name         VARCHAR(120)    NOT NULL,
  icon         VARCHAR(10)     NULL,
  description  VARCHAR(200)    NULL,
  price        DECIMAL(8,2)    NOT NULL DEFAULT 0,
  is_package   TINYINT(1)      NOT NULL DEFAULT 0,
  package_days INT             NULL,
  active       TINYINT(1)      NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uk_wellness_code (code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS wellness_bookings (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id          BIGINT UNSIGNED NOT NULL,
  therapy_id       BIGINT UNSIGNED NOT NULL,
  duration_min     INT             NOT NULL DEFAULT 60,
  therapist_gender ENUM('male','female','any') NOT NULL DEFAULT 'any',
  visit_date       DATE            NOT NULL,
  time_slot        VARCHAR(20)     NOT NULL,
  health_note      VARCHAR(200)    NULL,
  status           ENUM('booked','completed','cancelled') NOT NULL DEFAULT 'booked',
  created_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_wellness_user (user_id, visit_date),
  CONSTRAINT fk_wb_therapy FOREIGN KEY (therapy_id) REFERENCES wellness_therapies(id)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================================
-- SEED — therapies
-- =========================================================================

INSERT INTO wellness_therapies (code, name, icon, description, price, is_package, package_days, active)
SELECT src.code, src.name, src.icon, src.descr, src.price, src.pkg, src.days, 1 FROM (
  SELECT 'ABH' AS code, 'Abhyanga'    AS name, '💆' AS icon, 'Full-body warm herbal oil massage'        AS descr, 1200.00 AS price, 0 AS pkg, NULL AS days UNION ALL
  SELECT 'SHI',         'Shirodhara',         '🪔',          'Continuous oil stream on the forehead',           1500.00,        0,         NULL UNION ALL
  SELECT 'PAN',         'Panchakarma',        '🌿',          '7-day Ayurvedic detox & rejuvenation',            8000.00,        1,         7    UNION ALL
  SELECT 'YOG',         'Yoga',               '🧘',          'Guided group / personal yoga session',            500.00,         0,         NULL UNION ALL
  SELECT 'MED',         'Meditation',         '🕉️',          'Mindfulness & breathing session',                 400.00,         0,         NULL
) src
WHERE NOT EXISTS (SELECT 1 FROM wellness_therapies t WHERE t.code = src.code);
