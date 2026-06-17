-- =========================================================================
-- Admin Portal — Module A12: Community & Visitors
--   Announcements: add image, active flag, optional expiry.
--   Events: add image + ordering. visitor_passes already exists (status mgmt).
-- =========================================================================

ALTER TABLE community_announcements
  ADD COLUMN image_url  VARCHAR(255) NULL AFTER body,
  ADD COLUMN is_active  TINYINT(1)   NOT NULL DEFAULT 1 AFTER pinned,
  ADD COLUMN expires_at DATETIME     NULL AFTER is_active;

ALTER TABLE community_events
  ADD COLUMN image_url  VARCHAR(255) NULL AFTER title,
  ADD COLUMN sort_order INT          NOT NULL DEFAULT 0 AFTER active;
