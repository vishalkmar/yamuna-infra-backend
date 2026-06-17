-- =========================================================================
-- Module 3 — Invoice & Document Repository
--   • View tracking on documents (count + last-viewed)
--   • Archive flag (so users can hide older docs without deleting)
--   • document_views audit table
--   • document_share_events for batch share/download analytics
-- =========================================================================

SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE documents
  ADD COLUMN view_count       INT          NOT NULL DEFAULT 0 AFTER uploaded_at,
  ADD COLUMN last_viewed_at   DATETIME     NULL AFTER view_count,
  ADD COLUMN archived_at      DATETIME     NULL AFTER last_viewed_at,
  ADD COLUMN thumbnail_url    VARCHAR(500) NULL AFTER archived_at,
  ADD COLUMN financial_year   VARCHAR(8)   NULL AFTER thumbnail_url;

CREATE INDEX idx_docs_category_archived ON documents (booking_id, category, archived_at);
CREATE INDEX idx_docs_uploaded ON documents (booking_id, uploaded_at);

CREATE TABLE IF NOT EXISTS document_views (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  document_id   BIGINT UNSIGNED NOT NULL,
  user_id       BIGINT UNSIGNED NOT NULL,
  source        ENUM('list','detail','share','download','sign') NOT NULL DEFAULT 'detail',
  viewed_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_dv_doc (document_id, viewed_at),
  KEY idx_dv_user (user_id, viewed_at),
  CONSTRAINT fk_dv_doc  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  CONSTRAINT fk_dv_user FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS document_share_events (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         BIGINT UNSIGNED NOT NULL,
  document_ids    JSON            NOT NULL,
  channel         ENUM('whatsapp','email','sms','copy_link','os_share','download_zip') NOT NULL,
  recipient       VARCHAR(180)    NULL,
  doc_count       INT             NOT NULL DEFAULT 0,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_dse_user (user_id, created_at)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================================
-- SEED — backfill financial_year on existing docs + add a few invoices/receipts
-- =========================================================================

UPDATE documents SET financial_year = CASE
  WHEN MONTH(uploaded_at) >= 4 THEN CONCAT(YEAR(uploaded_at) % 100, '-', (YEAR(uploaded_at) + 1) % 100)
  ELSE CONCAT((YEAR(uploaded_at) - 1) % 100, '-', YEAR(uploaded_at) % 100)
END
WHERE financial_year IS NULL;

-- Add more demo docs so the repository screen feels populated
INSERT INTO documents (booking_id, name, category, storage_path, file_size, requires_signature, financial_year)
SELECT b.id, src.name, src.category, src.storage_path, src.file_size, src.requires_signature, src.fy
FROM bookings b
JOIN (
  SELECT 'Invoice INV-1001.pdf'  AS name, 'invoice'  AS category, '/files/BK-2024-00421/inv-1001.pdf'  AS storage_path, '180 KB' AS file_size, 0 AS requires_signature, '24-25' AS fy UNION ALL
  SELECT 'Invoice INV-1002.pdf',       'invoice',       '/files/BK-2024-00421/inv-1002.pdf',       '195 KB',           0,                     '24-25' UNION ALL
  SELECT 'Invoice INV-1003.pdf',       'invoice',       '/files/BK-2024-00421/inv-1003.pdf',       '210 KB',           0,                     '25-26' UNION ALL
  SELECT 'Receipt-1246.pdf',           'receipt',       '/files/BK-2024-00421/receipt-1246.pdf',   '305 KB',           0,                     '24-25' UNION ALL
  SELECT 'GST Certificate.pdf',        'tax',           '/files/BK-2024-00421/gst-cert.pdf',       '420 KB',           0,                     '24-25' UNION ALL
  SELECT 'NOC - Society.pdf',          'noc',           '/files/BK-2024-00421/noc-society.pdf',    '180 KB',           0,                     '25-26'
) src
WHERE b.booking_code = 'BK-2024-00421'
  AND NOT EXISTS (SELECT 1 FROM documents d WHERE d.booking_id = b.id AND d.name = src.name);
