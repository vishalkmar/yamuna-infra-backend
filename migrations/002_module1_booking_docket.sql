-- =========================================================================
-- Module 1 — Booking Docket & Welcome Kit
--   • Adds e-signature tracking on documents
--   • Adds esignature_events audit log
--   • Adds welcome_kit_items for project marketing content
--   • Seeds documents, welcome kit, owner mapping, RM email
-- =========================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ----- 1. Track e-sign status on documents themselves -----
-- (Migration runner ensures this file applies at most once, so plain ADD is safe.)
ALTER TABLE documents
  ADD COLUMN signed_at            DATETIME        NULL AFTER uploaded_at,
  ADD COLUMN signed_by_user_id    BIGINT UNSIGNED NULL AFTER signed_at,
  ADD COLUMN requires_signature   TINYINT(1)      NOT NULL DEFAULT 0 AFTER signed_by_user_id,
  ADD COLUMN provider_envelope_id VARCHAR(120)    NULL AFTER requires_signature;

-- ----- 2. Audit trail for every signing attempt / event -----
CREATE TABLE IF NOT EXISTS esignature_events (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  document_id   BIGINT UNSIGNED NOT NULL,
  booking_id    BIGINT UNSIGNED NOT NULL,
  user_id       BIGINT UNSIGNED NOT NULL,
  envelope_id   VARCHAR(120)    NULL,
  status        ENUM('initiated','viewed','signed','declined','expired','failed') NOT NULL,
  ip_address    VARCHAR(64)     NULL,
  user_agent    VARCHAR(255)    NULL,
  notes         TEXT            NULL,
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_esign_doc (document_id, status),
  KEY idx_esign_user (user_id),
  CONSTRAINT fk_esign_doc      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  CONSTRAINT fk_esign_booking  FOREIGN KEY (booking_id)  REFERENCES bookings(id)  ON DELETE CASCADE,
  CONSTRAINT fk_esign_user     FOREIGN KEY (user_id)     REFERENCES users(id)
) ENGINE=InnoDB;

-- ----- 3. Welcome kit — marketing images + brochure -----
CREATE TABLE IF NOT EXISTS welcome_kit_items (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id   BIGINT UNSIGNED NOT NULL,
  kind         ENUM('image','video','pdf','message') NOT NULL DEFAULT 'image',
  title        VARCHAR(180)    NULL,
  caption      VARCHAR(255)    NULL,
  url          VARCHAR(500)    NULL,
  sort_order   INT             NOT NULL DEFAULT 0,
  active       TINYINT(1)      NOT NULL DEFAULT 1,
  created_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_wk_project (project_id, active, sort_order),
  CONSTRAINT fk_wk_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================================
-- SEED
-- =========================================================================

-- 1. Patch the seed booking with email on RM
UPDATE relationship_managers SET email = 'kunal@yamunainfra.com' WHERE id = 1;

-- 2. Seed a primary owner user for BK-2024-00421 (mobile 9876543210)
INSERT INTO users (mobile, name, email, primary_booking_id)
VALUES ('9876543210', 'Piyush Sharma', 'piyushb88@gmail.com', 'BK-2024-00421')
ON DUPLICATE KEY UPDATE
  name = COALESCE(VALUES(name), name),
  email = COALESCE(VALUES(email), email),
  primary_booking_id = COALESCE(primary_booking_id, VALUES(primary_booking_id));

-- 3. Link that user to the booking as primary owner
INSERT IGNORE INTO booking_owners (booking_id, user_id, role)
SELECT b.id, u.id, 'primary'
FROM bookings b JOIN users u ON u.mobile = '9876543210'
WHERE b.booking_code = 'BK-2024-00421';

-- 4. Seed 6 documents for the booking (idempotent via unique-on-name within booking)
--    We don't have a unique index there yet — guard with NOT EXISTS instead.
INSERT INTO documents (booking_id, name, category, storage_path, file_size, requires_signature)
SELECT b.id, src.name, src.category, src.storage_path, src.file_size, src.requires_signature
FROM bookings b
JOIN (
  SELECT 'Booking Docket.pdf'   AS name, 'agreement' AS category, '/files/BK-2024-00421/booking-docket.pdf'   AS storage_path, '1.2 MB' AS file_size, 0 AS requires_signature UNION ALL
  SELECT 'Allotment Letter.pdf',        'agreement',              '/files/BK-2024-00421/allotment-letter.pdf',              '780 KB',           0 UNION ALL
  SELECT 'Sale Agreement.pdf',          'agreement',              '/files/BK-2024-00421/sale-agreement.pdf',                '2.4 MB',           1 UNION ALL
  SELECT 'Receipt-1245.pdf',            'receipt',                '/files/BK-2024-00421/receipt-1245.pdf',                  '320 KB',           0 UNION ALL
  SELECT 'NOC.pdf',                     'noc',                    '/files/BK-2024-00421/noc.pdf',                            '410 KB',           0 UNION ALL
  SELECT 'Tax Invoice FY24-25.pdf',     'tax',                    '/files/BK-2024-00421/tax-invoice-fy24-25.pdf',           '290 KB',           0
) src
WHERE b.booking_code = 'BK-2024-00421'
  AND NOT EXISTS (
    SELECT 1 FROM documents d WHERE d.booking_id = b.id AND d.name = src.name
  );

-- 5. Welcome kit items for Vrindavan Heights
INSERT INTO welcome_kit_items (project_id, kind, title, caption, url, sort_order)
SELECT p.id, src.kind, src.title, src.caption, src.url, src.sort_order
FROM projects p
JOIN (
  SELECT 'image' AS kind, 'Project Skyline' AS title, 'Twin towers as on 2026'   AS caption, 'https://picsum.photos/seed/yh1/800/500' AS url, 1 AS sort_order UNION ALL
  SELECT 'image',         'Clubhouse',              'Premium amenities',          'https://picsum.photos/seed/yh2/800/500',           2 UNION ALL
  SELECT 'image',         'Sample Apartment',       '3-BHK ready-to-move sample', 'https://picsum.photos/seed/yh3/800/500',           3 UNION ALL
  SELECT 'image',         'Wellness Centre',        'Ayurvedic & Yoga centre',    'https://picsum.photos/seed/yh4/800/500',           4 UNION ALL
  SELECT 'pdf',           'Welcome Kit Brochure',   'Complete project brochure',  '/files/welcome-kit/vrindavan-heights-welcome.pdf', 5 UNION ALL
  SELECT 'message',       'Welcome Home!',          'A note from the chairperson','Your dream home is shaping up beautifully. We can''t wait to hand you the keys.', 6
) src
WHERE p.code = 'VH'
  AND NOT EXISTS (
    SELECT 1 FROM welcome_kit_items w WHERE w.project_id = p.id AND w.title = src.title
  );
