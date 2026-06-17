-- =========================================================================
-- Module 6 — Customer Support & Service Desk
--   • Extends support_tickets with agent / activity / rating columns
--   • ticket_attachments — photos / docs attached to a ticket (max 3, app-enforced)
--   • support_appointments — CRM executive call scheduling
--   • Seeds one in-progress ticket with a 3-message thread for the demo user
-- =========================================================================

SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE support_tickets
  ADD COLUMN assigned_agent   VARCHAR(120) NULL AFTER status,
  ADD COLUMN last_message_at  DATETIME     NULL AFTER assigned_agent,
  ADD COLUMN resolved_at      DATETIME     NULL AFTER last_message_at,
  ADD COLUMN rating           TINYINT      NULL AFTER resolved_at;

CREATE TABLE IF NOT EXISTS ticket_attachments (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id  BIGINT UNSIGNED NOT NULL,
  url        VARCHAR(500)    NOT NULL,
  kind       ENUM('image','document') NOT NULL DEFAULT 'image',
  file_size  VARCHAR(20)     NULL,
  created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ta_ticket (ticket_id),
  CONSTRAINT fk_ta_ticket FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS support_appointments (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id    BIGINT UNSIGNED NULL,
  user_id      BIGINT UNSIGNED NOT NULL,
  agent_name   VARCHAR(120)    NOT NULL,
  scheduled_at DATETIME        NOT NULL,
  mode         ENUM('call','video') NOT NULL DEFAULT 'call',
  status       ENUM('scheduled','completed','cancelled') NOT NULL DEFAULT 'scheduled',
  created_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sa_user (user_id, scheduled_at),
  CONSTRAINT fk_sa_ticket FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE SET NULL
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================================
-- SEED — one in-progress ticket + thread for the demo user (user_id 1)
-- =========================================================================

INSERT INTO support_tickets
  (user_id, booking_id, ticket_code, category, subject, description, priority, status, assigned_agent, last_message_at)
SELECT 1, b.id, 'SR-2026-00042', 'payment',
       'Receipt not received for Slab Casting payment',
       'I paid the Slab Casting installment yesterday via UPI but have not received the receipt on email or WhatsApp yet. Please share it.',
       'normal', 'in_progress', 'Kunal Naskar', '2026-06-05 11:20:00'
FROM bookings b
WHERE b.booking_code = 'BK-2024-00421'
  AND NOT EXISTS (SELECT 1 FROM support_tickets t WHERE t.ticket_code = 'SR-2026-00042');

INSERT INTO ticket_messages (ticket_id, author, body, created_at)
SELECT t.id, src.author, src.body, src.created_at
FROM support_tickets t
JOIN (
  SELECT 'user'  AS author, 'I paid the Slab Casting installment yesterday via UPI but have not received the receipt yet.' AS body, '2026-06-04 18:05:00' AS created_at UNION ALL
  SELECT 'agent', 'Thanks for reaching out, Piyush. I can see the payment. Generating your receipt now — you will get it within 2 hours.', '2026-06-05 10:15:00' UNION ALL
  SELECT 'user',  'Thank you, will wait for it.', '2026-06-05 11:20:00'
) src
WHERE t.ticket_code = 'SR-2026-00042'
  AND NOT EXISTS (SELECT 1 FROM ticket_messages m WHERE m.ticket_id = t.id);
