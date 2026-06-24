-- =========================================================================
-- Agent Management System — Module 5.2 (collateral) + 5.3 (training)
--   • agent_resources — shared library. kind = 'collateral' (brochures, price
--     lists, creatives) or 'training' (guides, videos). Admin manages; agents
--     view/download active items.
--
--   New table → idempotent (CREATE TABLE IF NOT EXISTS).
-- =========================================================================

CREATE TABLE IF NOT EXISTS agent_resources (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  kind          ENUM('collateral','training') NOT NULL DEFAULT 'collateral',
  category      VARCHAR(80)     NULL,
  title         VARCHAR(180)    NOT NULL,
  description   VARCHAR(500)    NULL,
  url           VARCHAR(500)    NOT NULL,
  file_type     ENUM('pdf','image','video','doc','link') NOT NULL DEFAULT 'link',
  thumbnail_url VARCHAR(500)    NULL,
  is_active     TINYINT(1)      NOT NULL DEFAULT 1,
  sort_order    INT             NOT NULL DEFAULT 0,
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_resources_kind (kind, is_active)
) ENGINE=InnoDB;
