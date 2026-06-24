-- =========================================================================
-- Agent Management System — Module 4.1: Commission Rules Engine
--   • commission_rules — how an agent's commission on a booking is computed.
--     scope_type: global | project | tier  (most specific + highest priority wins)
--     calc_type:  flat (₹) | percent (% of deal value) | slab (JSON bands)
--     slabs JSON: [{ "min":0, "max":5000000, "type":"percent", "value":1.5 }, ...]
--     effective_from/to bound the rule in time.
--   Resolution + computation live in the model; the ledger (4.2) consumes them.
--
--   New table → idempotent (CREATE TABLE IF NOT EXISTS).
-- =========================================================================

CREATE TABLE IF NOT EXISTS commission_rules (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name           VARCHAR(140)    NOT NULL,
  scope_type     ENUM('global','project','tier') NOT NULL DEFAULT 'global',
  project_id     BIGINT UNSIGNED NULL,
  tier_id        BIGINT UNSIGNED NULL,
  calc_type      ENUM('flat','percent','slab') NOT NULL DEFAULT 'percent',
  value          DECIMAL(15,2)   NOT NULL DEFAULT 0,
  slabs          JSON            NULL,
  priority       INT             NOT NULL DEFAULT 0,
  effective_from DATE            NULL,
  effective_to   DATE            NULL,
  is_active      TINYINT(1)      NOT NULL DEFAULT 1,
  created_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_comm_rules_scope (scope_type, is_active),
  KEY idx_comm_rules_project (project_id),
  KEY idx_comm_rules_tier (tier_id),
  CONSTRAINT fk_comm_rules_project FOREIGN KEY (project_id) REFERENCES agent_projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_comm_rules_tier FOREIGN KEY (tier_id) REFERENCES agent_tiers (id) ON DELETE CASCADE
) ENGINE=InnoDB;
