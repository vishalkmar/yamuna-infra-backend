-- =========================================================================
-- Admin Portal — Module A7: Mobility Aids
--   `mobility_aids` already has category/rent/buy/attendant. Adds image,
--   deposit and ordering. mobility_bookings (requests) already exists.
-- =========================================================================

ALTER TABLE mobility_aids
  ADD COLUMN image_url  VARCHAR(255)  NULL AFTER name,
  ADD COLUMN deposit    DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER buy_price,
  ADD COLUMN sort_order INT           NOT NULL DEFAULT 0 AFTER active;
