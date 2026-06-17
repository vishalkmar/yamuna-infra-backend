-- =========================================================================
-- Admin Portal — Module A15: AI Concierge (RAG knowledge base)
--   ai_knowledge_sources — admin-managed knowledge the chatbot answers from.
--   ai_chunks            — chunked text + embedding vector (JSON) for retrieval.
--   (ai_messages already stores the per-user chat history.)
-- =========================================================================

CREATE TABLE IF NOT EXISTS ai_knowledge_sources (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  type        ENUM('text','faq','url','instruction') NOT NULL DEFAULT 'text',
  title       VARCHAR(200)    NOT NULL,
  content     MEDIUMTEXT      NOT NULL,
  is_active   TINYINT(1)      NOT NULL DEFAULT 1,
  chunk_count INT             NOT NULL DEFAULT 0,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ai_chunks (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source_id   BIGINT UNSIGNED NOT NULL,
  chunk_index INT             NOT NULL DEFAULT 0,
  text        TEXT            NOT NULL,
  embedding   LONGTEXT        NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ai_chunks_source (source_id),
  CONSTRAINT fk_ai_chunks_source FOREIGN KEY (source_id)
    REFERENCES ai_knowledge_sources (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Seed a starter knowledge source so the bot has something to answer from.
INSERT INTO ai_knowledge_sources (type, title, content)
SELECT 'faq', 'Community basics', 'Banke Bihari Temple aarti timings: Shringar 9:00 AM, Rajbhog 12:00 PM, Shayan 9:00 PM. The clubhouse is open 6 AM to 10 PM. SOS help is available 24x7 from the app. Food orders are delivered within the township. For cab booking use Darshan & Transport in the Services tab.'
WHERE NOT EXISTS (SELECT 1 FROM ai_knowledge_sources WHERE title = 'Community basics');
