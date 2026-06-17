-- =========================================================================
-- Admin Portal — Module A14: Notifications & Broadcast
--   `notifications` is per-user. Adds batch grouping + icon/link so the admin
--   can compose a broadcast (fanned out to many users) and see history +
--   read stats. notification_batches stores one row per send.
-- =========================================================================

ALTER TABLE notifications
  ADD COLUMN batch_id BIGINT UNSIGNED NULL AFTER user_id,
  ADD COLUMN icon     VARCHAR(20)     NULL AFTER category,
  ADD COLUMN link     VARCHAR(160)    NULL AFTER icon,
  ADD KEY idx_notifications_batch (batch_id),
  ADD KEY idx_notifications_user_read (user_id, read_at);

CREATE TABLE IF NOT EXISTS notification_batches (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title        VARCHAR(200)    NOT NULL,
  body         TEXT            NOT NULL,
  category     VARCHAR(40)     NULL,
  icon         VARCHAR(20)     NULL,
  link         VARCHAR(160)    NULL,
  target_type  ENUM('all','kyc','tower','user') NOT NULL DEFAULT 'all',
  target_value VARCHAR(60)     NULL,
  total_count  INT             NOT NULL DEFAULT 0,
  created_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;
