-- =========================================================================
-- Admin Portal — Module A9: Temple Directory
--   `temples` already has image/aarti/maps/donation/vip/crowd/description.
--   Adds only featured + sort_order (9.4 pin/ordering). Festivals & darshan
--   bookings use existing temple_festivals / darshan_bookings tables.
-- =========================================================================

ALTER TABLE temples
  ADD COLUMN featured   TINYINT(1) NOT NULL DEFAULT 0 AFTER vip_available,
  ADD COLUMN sort_order INT        NOT NULL DEFAULT 0 AFTER featured;
