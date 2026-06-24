-- =========================================================================
-- Agent Management System — Module 5.6: Lead nurture (WhatsApp/SMS/Email)
--   • lead_message_templates — admin-managed quick messages per channel.
--     Placeholders like {{name}} / {{project}} are filled client-side.
--
--   New table → idempotent (CREATE TABLE IF NOT EXISTS).
-- =========================================================================

CREATE TABLE IF NOT EXISTS lead_message_templates (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  channel     ENUM('whatsapp','sms','email') NOT NULL DEFAULT 'whatsapp',
  title       VARCHAR(140)    NOT NULL,
  subject     VARCHAR(180)    NULL,
  body        VARCHAR(2000)   NOT NULL,
  is_active   TINYINT(1)      NOT NULL DEFAULT 1,
  sort_order  INT             NOT NULL DEFAULT 0,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_templates_channel (channel, is_active)
) ENGINE=InnoDB;
