-- =========================================================================
-- Module 9 — Move-In Assistance
--   • movein_shifting_bookings — packers & movers booking
--   • movein_utility_requests  — electricity / water / gas / internet activation
--   • interior_partners         — vetted interior designers (seeded)
--   • movein_interior_referrals — referral requests to interior partners
-- =========================================================================

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS movein_shifting_bookings (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         BIGINT UNSIGNED NOT NULL,
  booking_id      BIGINT UNSIGNED NULL,
  move_date       DATE            NOT NULL,
  from_address    VARCHAR(300)    NOT NULL,
  to_unit         VARCHAR(80)     NULL,
  item_categories VARCHAR(120)    NOT NULL,           -- CSV: furniture,electronics,fragile,vehicle
  packing_required TINYINT(1)     NOT NULL DEFAULT 0,
  special_items   VARCHAR(200)    NULL,
  vendor_name     VARCHAR(120)    NULL,
  status          ENUM('requested','confirmed','completed','cancelled') NOT NULL DEFAULT 'requested',
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_msb_user (user_id, move_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS movein_utility_requests (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id            BIGINT UNSIGNED NOT NULL,
  booking_id         BIGINT UNSIGNED NULL,
  utility_type       ENUM('electricity','water','piped_gas','internet') NOT NULL,
  provider_name      VARCHAR(120)    NULL,
  expected_activation DATE           NULL,
  status             ENUM('submitted','in_progress','activated') NOT NULL DEFAULT 'submitted',
  created_at         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_mur_user (user_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS interior_partners (
  id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name      VARCHAR(120)    NOT NULL,
  specialty VARCHAR(120)    NULL,
  phone     VARCHAR(15)     NOT NULL,
  rating    DECIMAL(2,1)    NULL,
  active    TINYINT(1)      NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS movein_interior_referrals (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  partner_id  BIGINT UNSIGNED NOT NULL,
  note        VARCHAR(300)    NULL,
  status      ENUM('sent','contacted','closed') NOT NULL DEFAULT 'sent',
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_mir_user (user_id),
  CONSTRAINT fk_mir_partner FOREIGN KEY (partner_id) REFERENCES interior_partners(id)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================================
-- SEED — interior partners
-- =========================================================================

INSERT INTO interior_partners (name, specialty, phone, rating, active)
SELECT src.name, src.specialty, src.phone, src.rating, 1 FROM (
  SELECT 'Vrindavan Interiors'   AS name, 'Full home interiors, modular kitchens' AS specialty, '9810011111' AS phone, 4.7 AS rating UNION ALL
  SELECT 'NestCraft Studio',          'Space planning & custom furniture',             '9810022222', 4.5 UNION ALL
  SELECT 'Saffron Living',            'Vastu-aligned & spiritual decor',               '9810033333', 4.8
) src
WHERE NOT EXISTS (SELECT 1 FROM interior_partners p WHERE p.name = src.name);
