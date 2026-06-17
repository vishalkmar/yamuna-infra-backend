-- =========================================================================
-- Admin Portal — Module A4: Services & Providers
--   • Adds image / active / ordering columns to service catalog tables
--   • Creates provider_offerings (was mock-only in the app) so a provider can
--     have multiple priced, bookable services — managed by the admin.
-- =========================================================================

ALTER TABLE service_categories
  ADD COLUMN image_url  VARCHAR(255) NULL AFTER icon,
  ADD COLUMN is_active  TINYINT(1)   NOT NULL DEFAULT 1 AFTER image_url,
  ADD COLUMN sort_order INT          NOT NULL DEFAULT 0 AFTER is_active;

ALTER TABLE service_providers
  ADD COLUMN image_url  VARCHAR(255) NULL AFTER tagline,
  ADD COLUMN featured   TINYINT(1)   NOT NULL DEFAULT 0 AFTER active,
  ADD COLUMN sort_order INT          NOT NULL DEFAULT 0 AFTER featured;

CREATE TABLE IF NOT EXISTS provider_offerings (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  provider_id BIGINT UNSIGNED NOT NULL,
  name        VARCHAR(140)    NOT NULL,
  description VARCHAR(400)    NULL,
  price       DECIMAL(10,2)   NOT NULL DEFAULT 0,
  unit        VARCHAR(40)     NULL,
  image_url   VARCHAR(255)    NULL,
  is_active   TINYINT(1)      NOT NULL DEFAULT 1,
  sort_order  INT             NOT NULL DEFAULT 0,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_offerings_provider (provider_id),
  CONSTRAINT fk_offerings_provider FOREIGN KEY (provider_id)
    REFERENCES service_providers (id) ON DELETE CASCADE
) ENGINE=InnoDB;
