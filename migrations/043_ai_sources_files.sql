-- =========================================================================
-- Task 5 — RAG v2: support file/URL knowledge sources.
--   Extends ai_knowledge_sources.type + adds filename / char_count.
-- =========================================================================

ALTER TABLE ai_knowledge_sources
  MODIFY COLUMN type ENUM('text','faq','url','instruction','pdf','docx','excel','csv')
    NOT NULL DEFAULT 'text',
  ADD COLUMN filename   VARCHAR(255) NULL AFTER title,
  ADD COLUMN char_count INT          NOT NULL DEFAULT 0 AFTER chunk_count;
