-- =========================================================================
-- Agent Management System — Module 3.4: Booking / Sale creation
--   • agent_bookings — the sale record created when a lead converts. Snapshots
--     the buyer, links the unit + agent + lead. status: pending → approved
--     (3.5) | cancelled (3.7). linked_user_id / linked_property_id are filled
--     when an approved booking is pushed into the resident system (3.6).
--
--   On creation: the unit flips to 'booked' and the lead stage → 'booked'
--   (handled transactionally in the model).
--
--   New table → idempotent (CREATE TABLE IF NOT EXISTS).
-- =========================================================================

CREATE TABLE IF NOT EXISTS agent_bookings (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  lead_id          BIGINT UNSIGNED NULL,
  agent_id         BIGINT UNSIGNED NULL,
  project_id       BIGINT UNSIGNED NULL,
  unit_id          BIGINT UNSIGNED NULL,
  buyer_name       VARCHAR(140)    NOT NULL,
  buyer_phone      VARCHAR(20)     NULL,
  buyer_email      VARCHAR(180)    NULL,
  deal_value       DECIMAL(15,2)   NOT NULL DEFAULT 0,
  booking_amount   DECIMAL(15,2)   NOT NULL DEFAULT 0,
  status           ENUM('pending','approved','cancelled') NOT NULL DEFAULT 'pending',
  approved_by      VARCHAR(120)    NULL,
  approved_at      DATETIME        NULL,
  cancel_reason    VARCHAR(300)    NULL,
  linked_user_id     BIGINT UNSIGNED NULL,          -- Module 3.6
  linked_property_id BIGINT UNSIGNED NULL,          -- Module 3.6
  notes            VARCHAR(500)    NULL,
  created_by_type  ENUM('agent','admin') NOT NULL,
  created_by_name  VARCHAR(120)    NULL,
  created_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_bookings_agent (agent_id),
  KEY idx_bookings_status (status),
  KEY idx_bookings_unit (unit_id),
  CONSTRAINT fk_agent_bk_lead FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE SET NULL,
  CONSTRAINT fk_agent_bk_agent FOREIGN KEY (agent_id) REFERENCES agents (id) ON DELETE SET NULL,
  CONSTRAINT fk_agent_bk_project FOREIGN KEY (project_id) REFERENCES agent_projects (id) ON DELETE SET NULL,
  CONSTRAINT fk_agent_bk_unit FOREIGN KEY (unit_id) REFERENCES units (id) ON DELETE SET NULL
) ENGINE=InnoDB;
