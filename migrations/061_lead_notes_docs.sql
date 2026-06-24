-- =========================================================================
-- Agent Management System — Module 2.8: Lead Notes, Activity & Documents
--   • lead_notes      — free-text activity log on a lead (call summary, meeting
--                       note, remark). Complements stage history (2.5) + tasks
--                       (2.7) to form the full lead timeline.
--   • lead_documents  — files attached to a lead (buyer ID, agreement draft,
--                       cost sheet). URL via Cloudinary / pasted link.
--
--   New tables → idempotent (CREATE TABLE IF NOT EXISTS).
-- =========================================================================

CREATE TABLE IF NOT EXISTS lead_notes (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  lead_id     BIGINT UNSIGNED NOT NULL,
  body        VARCHAR(1000)   NOT NULL,
  by_type     ENUM('agent','admin') NOT NULL,
  by_name     VARCHAR(120)    NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_lead_notes_lead (lead_id),
  CONSTRAINT fk_lead_notes_lead FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lead_documents (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  lead_id     BIGINT UNSIGNED NOT NULL,
  label       VARCHAR(160)    NULL,
  url         VARCHAR(500)    NOT NULL,
  by_type     ENUM('agent','admin') NOT NULL,
  by_name     VARCHAR(120)    NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_lead_documents_lead (lead_id),
  CONSTRAINT fk_lead_documents_lead FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE CASCADE
) ENGINE=InnoDB;
