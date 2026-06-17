-- =========================================================================
-- Module 7 — Digital Possession Dashboard
--   • Extends possession_checklists with ordering + category
--   • possession_appointments — handover slot booking
--   • possession_documents — possession letter / NOC downloads
--   • Seeds an 6-step checklist (partly done → "pending clearance"),
--     possession documents, for the demo booking
-- =========================================================================

SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE possession_checklists
  ADD COLUMN category   VARCHAR(40) NULL AFTER step,
  ADD COLUMN sort_order INT         NOT NULL DEFAULT 0 AFTER completed;

CREATE TABLE IF NOT EXISTS possession_appointments (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id      BIGINT UNSIGNED NOT NULL,
  appointment_date DATE           NOT NULL,
  time_slot       VARCHAR(40)     NOT NULL,
  attendees       INT             NOT NULL DEFAULT 1,
  special_request VARCHAR(300)    NULL,
  status          ENUM('scheduled','completed','cancelled') NOT NULL DEFAULT 'scheduled',
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pa_booking (booking_id, appointment_date),
  CONSTRAINT fk_pa_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS possession_documents (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id  BIGINT UNSIGNED NOT NULL,
  name        VARCHAR(200)    NOT NULL,
  kind        ENUM('possession_letter','noc','handover','other') NOT NULL DEFAULT 'other',
  url         VARCHAR(500)    NOT NULL,
  available   TINYINT(1)      NOT NULL DEFAULT 1,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pd_booking (booking_id),
  CONSTRAINT fk_pd_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================================
-- SEED — checklist + documents for the demo booking (BK-2024-00421)
-- =========================================================================

INSERT INTO possession_checklists (booking_id, step, category, completed, sort_order)
SELECT b.id, src.step, src.category, src.completed, src.sort_order
FROM bookings b
JOIN (
  SELECT 'Final payment cleared'        AS step, 'payment'  AS category, 1 AS completed, 1 AS sort_order UNION ALL
  SELECT 'Agreement fully signed',          'document',                 1,              2 UNION ALL
  SELECT 'No-dues certificate issued',      'document',                 1,              3 UNION ALL
  SELECT 'Snag inspection completed',       'inspection',               0,              4 UNION ALL
  SELECT 'Possession letter generated',     'document',                 0,              5 UNION ALL
  SELECT 'Keys & handover kit ready',       'handover',                 0,              6
) src
WHERE b.booking_code = 'BK-2024-00421'
  AND NOT EXISTS (
    SELECT 1 FROM possession_checklists c WHERE c.booking_id = b.id AND c.step = src.step
  );

INSERT INTO possession_documents (booking_id, name, kind, url, available)
SELECT b.id, src.name, src.kind, src.url, src.available
FROM bookings b
JOIN (
  SELECT 'Possession Letter'            AS name, 'possession_letter' AS kind, '/files/possession/BK-2024-00421-letter.pdf' AS url, 0 AS available UNION ALL
  SELECT 'No-Objection Certificate (NOC)',     'noc',                       '/files/possession/BK-2024-00421-noc.pdf',           1 UNION ALL
  SELECT 'Handover Checklist',                 'handover',                  '/files/possession/BK-2024-00421-handover.pdf',      1
) src
WHERE b.booking_code = 'BK-2024-00421'
  AND NOT EXISTS (
    SELECT 1 FROM possession_documents d WHERE d.booking_id = b.id AND d.name = src.name
  );
