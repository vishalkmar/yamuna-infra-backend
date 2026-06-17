-- =========================================================================
-- Module 4 — Construction Progress Tracker
--   • Adds description / expected date / cover photo / completed_at to milestones
--   • milestone_photos for the photo grid
--   • project_subscriptions for per-milestone push opt-in
--   • Seeds 5 milestones with descriptions + dates, and 8 weekly updates
-- =========================================================================

SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE project_milestones
  ADD COLUMN description       TEXT         NULL AFTER name,
  ADD COLUMN expected_date     DATE         NULL AFTER description,
  ADD COLUMN completed_at      DATETIME     NULL AFTER expected_date,
  ADD COLUMN cover_photo_url   VARCHAR(500) NULL AFTER completed_at;

CREATE TABLE IF NOT EXISTS milestone_photos (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  milestone_id BIGINT UNSIGNED NOT NULL,
  url          VARCHAR(500)    NOT NULL,
  caption      VARCHAR(200)    NULL,
  taken_at     DATE            NULL,
  sort_order   INT             NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_mp_milestone (milestone_id, sort_order),
  CONSTRAINT fk_mp_milestone FOREIGN KEY (milestone_id) REFERENCES project_milestones(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS project_subscriptions (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  milestone_id  BIGINT UNSIGNED NOT NULL,
  channels      SET('push','email','whatsapp','sms') NOT NULL DEFAULT 'push',
  enabled       TINYINT(1)      NOT NULL DEFAULT 1,
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_ps_user_ms (user_id, milestone_id),
  CONSTRAINT fk_ps_user      FOREIGN KEY (user_id)      REFERENCES users(id)              ON DELETE CASCADE,
  CONSTRAINT fk_ps_milestone FOREIGN KEY (milestone_id) REFERENCES project_milestones(id) ON DELETE CASCADE
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================================
-- SEED — descriptions + dates + photos + weekly updates
-- =========================================================================

UPDATE project_milestones
SET description = 'Excavation, retaining walls and footing completed. The site is ready to take the load of the tower.',
    expected_date = '2024-09-30',
    completed_at = '2024-09-15 17:00:00',
    cover_photo_url = 'https://picsum.photos/seed/yh-found/800/500'
WHERE name = 'Foundation Completion';

UPDATE project_milestones
SET description = 'All 14 floors of structural concrete cast. Vertical columns, beams and slabs complete.',
    expected_date = '2026-01-30',
    completed_at = '2026-01-22 16:30:00',
    cover_photo_url = 'https://picsum.photos/seed/yh-struct/800/500'
WHERE name = 'Structure Completion';

UPDATE project_milestones
SET description = 'Internal walls, plastering, electrical conduits and plumbing rough-ins are in progress across floors.',
    expected_date = '2026-12-31',
    cover_photo_url = 'https://picsum.photos/seed/yh-fin/800/500'
WHERE name = 'Internal Finishing';

UPDATE project_milestones
SET description = 'Garden, walking paths, water bodies and external lighting will be set up after the building is dressed.',
    expected_date = '2027-03-31'
WHERE name = 'Landscaping';

UPDATE project_milestones
SET description = 'Final inspection, snag list closure, occupancy certificate and key handover ceremony.',
    expected_date = '2027-06-30'
WHERE name = 'Possession Readiness';

-- Photos for completed milestones
INSERT INTO milestone_photos (milestone_id, url, caption, taken_at, sort_order)
SELECT m.id, src.url, src.caption, src.taken_at, src.sort_order
FROM project_milestones m
JOIN (
  SELECT 'Foundation Completion' AS mname, 'https://picsum.photos/seed/yh-found-1/800/500' AS url, 'Plinth ready'   AS caption, '2024-09-10' AS taken_at, 1 AS sort_order UNION ALL
  SELECT 'Foundation Completion',           'https://picsum.photos/seed/yh-found-2/800/500',       'Excavation done',           '2024-08-25',           2 UNION ALL
  SELECT 'Foundation Completion',           'https://picsum.photos/seed/yh-found-3/800/500',       'Footing reinforcement',     '2024-09-01',           3 UNION ALL
  SELECT 'Structure Completion',            'https://picsum.photos/seed/yh-struct-1/800/500',      '14th floor casting',        '2026-01-15',           1 UNION ALL
  SELECT 'Structure Completion',            'https://picsum.photos/seed/yh-struct-2/800/500',      'Slab work',                 '2025-08-12',           2 UNION ALL
  SELECT 'Structure Completion',            'https://picsum.photos/seed/yh-struct-3/800/500',      'Beam reinforcement',        '2025-11-20',           3 UNION ALL
  SELECT 'Internal Finishing',              'https://picsum.photos/seed/yh-fin-1/800/500',         'Plastering on floor 8',     '2026-05-10',           1 UNION ALL
  SELECT 'Internal Finishing',              'https://picsum.photos/seed/yh-fin-2/800/500',         'Electrical conduits',       '2026-05-25',           2
) src ON m.name = src.mname
WHERE NOT EXISTS (
  SELECT 1 FROM milestone_photos p WHERE p.milestone_id = m.id AND p.url = src.url
);

-- Weekly project updates (mixed images + drone video)
INSERT INTO project_updates (project_id, title, description, media_url, media_type, posted_at)
SELECT p.id, src.title, src.description, src.media_url, src.media_type, src.posted_at
FROM projects p
JOIN (
  SELECT 'Week 22 — Plastering on floors 6–8'        AS title, 'Internal plaster coats are progressing well.'      AS description, 'https://picsum.photos/seed/u22/800/500' AS media_url, 'image' AS media_type, '2026-05-31 11:00:00' AS posted_at UNION ALL
  SELECT 'Week 21 — Drone tour',                              'Latest aerial footage of the twin towers.',                'https://picsum.photos/seed/u21d/800/500',           'video',           '2026-05-24 10:00:00' UNION ALL
  SELECT 'Week 20 — Tile work begins on Tower 1',             'Sample apartment tiling started.',                         'https://picsum.photos/seed/u20/800/500',            'image',           '2026-05-17 10:00:00' UNION ALL
  SELECT 'Week 19 — Lift shaft cores finalised',              'All vertical cores cast.',                                 'https://picsum.photos/seed/u19/800/500',            'image',           '2026-05-10 10:00:00' UNION ALL
  SELECT 'Week 18 — Civil work on landscape ducts',           'Civil ducts for landscape lighting laid.',                 'https://picsum.photos/seed/u18/800/500',            'image',           '2026-05-03 10:00:00' UNION ALL
  SELECT 'Week 17 — Internal partitions',                     'Drywall partitions started in sample units.',              'https://picsum.photos/seed/u17/800/500',            'image',           '2026-04-26 10:00:00' UNION ALL
  SELECT 'Week 16 — Drone tour',                              'Aerial view from 200 ft showing both towers.',             'https://picsum.photos/seed/u16d/800/500',           'video',           '2026-04-19 10:00:00' UNION ALL
  SELECT 'Week 15 — Structure topped out!',                   'Twin towers reach full height.',                           'https://picsum.photos/seed/u15/800/500',            'image',           '2026-04-12 10:00:00'
) src ON p.code = 'VH'
WHERE NOT EXISTS (
  SELECT 1 FROM project_updates u WHERE u.project_id = p.id AND u.title = src.title
);
