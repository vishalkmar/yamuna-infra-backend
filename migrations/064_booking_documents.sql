-- =========================================================================
-- Agent Management System — Module 3.5: Booking approval & documentation
--   • agent_booking_documents — files attached to a booking (agreement, docket,
--     cost sheet, payment receipt, buyer KYC). URL via Cloudinary / link.
--   (Approval itself is a status change on agent_bookings + unit → 'sold',
--    handled transactionally in the model — no schema change needed there.)
--
--   New table → idempotent (CREATE TABLE IF NOT EXISTS).
-- =========================================================================

CREATE TABLE IF NOT EXISTS agent_booking_documents (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id  BIGINT UNSIGNED NOT NULL,
  doc_type    ENUM('agreement','docket','cost_sheet','payment_receipt','kyc','other') NOT NULL DEFAULT 'other',
  label       VARCHAR(160)    NULL,
  url         VARCHAR(500)    NOT NULL,
  by_type     ENUM('agent','admin') NOT NULL,
  by_name     VARCHAR(120)    NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_booking_docs_booking (booking_id),
  CONSTRAINT fk_booking_docs_booking FOREIGN KEY (booking_id)
    REFERENCES agent_bookings (id) ON DELETE CASCADE
) ENGINE=InnoDB;
