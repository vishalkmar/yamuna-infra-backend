-- =========================================================================
-- Admin Portal — Module A17: Media Library
--   Records every Cloudinary upload so admins can browse, search and reuse
--   images across modules (the ImageUploader writes a row here on upload).
-- =========================================================================

CREATE TABLE IF NOT EXISTS media_assets (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  url        VARCHAR(500)    NOT NULL,
  public_id  VARCHAR(255)    NULL,
  folder     VARCHAR(120)    NULL,
  label      VARCHAR(200)    NULL,
  format     VARCHAR(20)     NULL,
  bytes      INT             NULL,
  width      INT             NULL,
  height     INT             NULL,
  created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_media_created (created_at)
) ENGINE=InnoDB;
