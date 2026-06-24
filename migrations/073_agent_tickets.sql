-- =========================================================================
-- Agent Management System — Module 5.5: Agent Support / Ticketing
--   • agent_tickets          — a support request from an agent.
--   • agent_ticket_messages  — threaded replies (agent ↔ admin).
--
--   New tables → idempotent (CREATE TABLE IF NOT EXISTS).
-- =========================================================================

CREATE TABLE IF NOT EXISTS agent_tickets (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  agent_id        BIGINT UNSIGNED NOT NULL,
  subject         VARCHAR(180)    NOT NULL,
  category        VARCHAR(60)     NULL,
  status          ENUM('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
  priority        ENUM('low','normal','high') NOT NULL DEFAULT 'normal',
  last_message_at DATETIME        NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tickets_agent (agent_id),
  KEY idx_tickets_status (status),
  CONSTRAINT fk_tickets_agent FOREIGN KEY (agent_id) REFERENCES agents (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS agent_ticket_messages (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id   BIGINT UNSIGNED NOT NULL,
  sender_type ENUM('agent','admin') NOT NULL,
  sender_name VARCHAR(120)    NULL,
  body        VARCHAR(2000)   NOT NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ticket_msgs_ticket (ticket_id),
  CONSTRAINT fk_ticket_msgs_ticket FOREIGN KEY (ticket_id) REFERENCES agent_tickets (id) ON DELETE CASCADE
) ENGINE=InnoDB;
