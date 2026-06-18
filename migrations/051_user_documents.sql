-- =========================================================================
-- Task — Booking Docket & resident documents
--   Admin uploads PDFs per resident (booking docket etc.); the app lists them
--   for download. Also reused later for the invoice in the documents section.
--   Idempotent.
-- =========================================================================

CREATE TABLE IF NOT EXISTS user_documents (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL,
  title      VARCHAR(200)    NOT NULL,
  file_url   VARCHAR(600)    NOT NULL,
  kind       VARCHAR(40)     NOT NULL DEFAULT 'booking_docket',  -- booking_docket | other
  created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_userdoc_user (user_id, kind),
  CONSTRAINT fk_userdoc_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;
