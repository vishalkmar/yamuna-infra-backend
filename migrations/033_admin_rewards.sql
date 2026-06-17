-- =========================================================================
-- Admin Portal — Module A13: Rewards & Projects
--   Reward offers: add image + ordering.
--   Redemptions: new reward_redemptions table (offer redemptions the admin
--     fulfils). The resident redeem flow writes a row here too.
--   Investment projects: add ordering (already has image_url/active).
--   Referrals: read + status (table already exists).
-- =========================================================================

ALTER TABLE reward_offers
  ADD COLUMN image_url  VARCHAR(255) NULL AFTER description,
  ADD COLUMN sort_order INT          NOT NULL DEFAULT 0 AFTER active;

ALTER TABLE investment_projects
  ADD COLUMN sort_order INT NOT NULL DEFAULT 0 AFTER active;

CREATE TABLE IF NOT EXISTS reward_redemptions (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      BIGINT UNSIGNED NOT NULL,
  offer_id     BIGINT UNSIGNED NULL,
  offer_title  VARCHAR(150)    NOT NULL,
  points_spent INT             NOT NULL DEFAULT 0,
  status       ENUM('requested','fulfilled','cancelled') NOT NULL DEFAULT 'requested',
  created_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reward_redemptions_user (user_id),
  KEY idx_reward_redemptions_status (status)
) ENGINE=InnoDB;
