-- =========================================================================
-- Task — Site Overview (admin-managed, global; shown to every resident)
--   • site_overview  — single row: map link, address, overall progress
--   • site_images    — gallery
--   • site_updates   — progress updates feed (title + image + date)
--   Idempotent.
-- =========================================================================

CREATE TABLE IF NOT EXISTS site_overview (
  id               TINYINT(1)   NOT NULL DEFAULT 1,
  title            VARCHAR(180) NULL,
  address          VARCHAR(300) NULL,
  map_url          VARCHAR(600) NULL,
  progress_percent INT          NOT NULL DEFAULT 0,
  progress_note    VARCHAR(500) NULL,
  updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

INSERT INTO site_overview (id, title) SELECT 1, 'Yamuna Infra'
  WHERE NOT EXISTS (SELECT 1 FROM site_overview WHERE id = 1);

CREATE TABLE IF NOT EXISTS site_images (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  url        VARCHAR(600)    NOT NULL,
  caption    VARCHAR(200)    NULL,
  sort_order INT             NOT NULL DEFAULT 0,
  created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_site_img_sort (sort_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS site_updates (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title       VARCHAR(200)    NOT NULL,
  description TEXT            NULL,
  media_url   VARCHAR(600)    NULL,
  posted_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_site_upd_posted (posted_at)
) ENGINE=InnoDB;
