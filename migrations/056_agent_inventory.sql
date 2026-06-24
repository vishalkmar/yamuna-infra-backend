-- =========================================================================
-- Agent Management System — Module 2.1: Projects & Inventory Catalog
--   • agent_projects        — sellable developments (separate from the resident-side
--                       investment_projects marketing table and user_properties
--                       owned flats). This is the developer's live stock.
--   • project_towers  — blocks / phases within a project.
--   • units           — individual inventory rows. status drives availability;
--                       hold_until / held_by_agent_id back the hold/block flow
--                       built in Module 2.2 (columns added now to avoid churn).
--
--   New tables → idempotent (CREATE TABLE IF NOT EXISTS).
-- =========================================================================

CREATE TABLE IF NOT EXISTS agent_projects (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(180)    NOT NULL,
  location    VARCHAR(200)    NULL,
  city        VARCHAR(80)     NULL,
  state       VARCHAR(80)     NULL,
  status      ENUM('upcoming','ongoing','ready','sold_out') NOT NULL DEFAULT 'ongoing',
  rera_no     VARCHAR(60)     NULL,
  description TEXT            NULL,
  image_url   VARCHAR(500)    NULL,
  price_from  DECIMAL(15,2)   NOT NULL DEFAULT 0,
  price_to    DECIMAL(15,2)   NOT NULL DEFAULT 0,
  is_active   TINYINT(1)      NOT NULL DEFAULT 1,
  sort_order  INT             NOT NULL DEFAULT 0,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_projects_active (is_active),
  KEY idx_projects_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS project_towers (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id   BIGINT UNSIGNED NOT NULL,
  name         VARCHAR(120)    NOT NULL,            -- "Tower A", "Block 2", "Phase 1"
  total_floors INT             NULL,
  description  VARCHAR(400)    NULL,
  sort_order   INT             NOT NULL DEFAULT 0,
  created_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_towers_project (project_id),
  CONSTRAINT fk_towers_project FOREIGN KEY (project_id)
    REFERENCES agent_projects (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS units (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id      BIGINT UNSIGNED NOT NULL,
  tower_id        BIGINT UNSIGNED NULL,
  unit_no         VARCHAR(40)     NOT NULL,
  floor           VARCHAR(20)     NULL,
  unit_type       VARCHAR(40)     NULL,             -- 1BHK / 2BHK / villa ...
  area_sqft       DECIMAL(10,2)   NULL,
  base_price      DECIMAL(15,2)   NOT NULL DEFAULT 0,
  facing          VARCHAR(40)     NULL,
  status          ENUM('available','held','blocked','booked','sold') NOT NULL DEFAULT 'available',
  hold_until      DATETIME        NULL,             -- Module 2.2
  held_by_agent_id BIGINT UNSIGNED NULL,            -- Module 2.2
  notes           VARCHAR(400)    NULL,
  sort_order      INT             NOT NULL DEFAULT 0,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_units_project (project_id),
  KEY idx_units_tower (tower_id),
  KEY idx_units_status (status),
  CONSTRAINT fk_units_project FOREIGN KEY (project_id)
    REFERENCES agent_projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_units_tower FOREIGN KEY (tower_id)
    REFERENCES project_towers (id) ON DELETE SET NULL,
  CONSTRAINT fk_units_agent FOREIGN KEY (held_by_agent_id)
    REFERENCES agents (id) ON DELETE SET NULL
) ENGINE=InnoDB;
