-- =========================================================================
-- Task 4 — Email-OTP login (used when the app runs against the real backend).
--   Widen otps.mobile so it can also hold an email identifier; make users.mobile
--   nullable so email-only residents can be created; index email for lookups.
-- =========================================================================

ALTER TABLE otps MODIFY COLUMN mobile VARCHAR(180) NULL;

ALTER TABLE users MODIFY COLUMN mobile VARCHAR(15) NULL;
CREATE INDEX idx_users_email ON users (email);
