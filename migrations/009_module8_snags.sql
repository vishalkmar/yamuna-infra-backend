-- =========================================================================
-- Module 8 — Home Inspection & Snag Management
--   • Extends snags with resolution / sign-off / activity timestamps
--   • Seeds two demo snags (one resolved → awaiting sign-off, one open)
--     with photos, for the demo booking
-- =========================================================================

SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE snags
  ADD COLUMN resolved_at    DATETIME  NULL AFTER status,
  ADD COLUMN signed_off_at  DATETIME  NULL AFTER resolved_at,
  ADD COLUMN updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER signed_off_at;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================================
-- SEED — two snags for BK-2024-00421
-- =========================================================================

INSERT INTO snags (booking_id, snag_code, location, defect_type, description, severity, status, resolved_at)
SELECT b.id, src.snag_code, src.location, src.defect_type, src.description, src.severity, src.status, src.resolved_at
FROM bookings b
JOIN (
  SELECT 'SN-0001' AS snag_code, 'Bathroom 1' AS location, 'plumbing' AS defect_type,
         'Wash basin tap is leaking and water pressure is very low.' AS description,
         'major' AS severity, 'resolved' AS status, '2026-06-03 14:00:00' AS resolved_at
  UNION ALL
  SELECT 'SN-0002', 'Hall', 'paint',
         'Patchy paint finish on the north wall near the balcony door.',
         'minor', 'open', NULL
) src
WHERE b.booking_code = 'BK-2024-00421'
  AND NOT EXISTS (SELECT 1 FROM snags s WHERE s.snag_code = src.snag_code);

INSERT INTO snag_photos (snag_id, url)
SELECT s.id, src.url
FROM snags s
JOIN (
  SELECT 'SN-0001' AS snag_code, 'https://picsum.photos/seed/snag1a/600/400' AS url UNION ALL
  SELECT 'SN-0001',                'https://picsum.photos/seed/snag1b/600/400'        UNION ALL
  SELECT 'SN-0002',                'https://picsum.photos/seed/snag2a/600/400'
) src ON s.snag_code = src.snag_code
WHERE NOT EXISTS (SELECT 1 FROM snag_photos p WHERE p.snag_id = s.id AND p.url = src.url);
