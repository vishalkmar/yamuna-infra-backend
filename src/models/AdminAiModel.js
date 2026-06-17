const { pool } = require('../config/db');
const ai = require('../services/aiService');
const extract = require('../services/extractText');
const vstore = require('../services/vectorStore');

const AdminAiModel = {
  // ---------- Sources ----------
  async listSources() {
    const [rows] = await pool.query(
      `SELECT id, type, title, filename, content, is_active AS isActive,
              chunk_count AS chunkCount, char_count AS charCount, updated_at AS updatedAt
       FROM ai_knowledge_sources ORDER BY id ASC`,
    );
    // Trim long content in the list (full text still on the row for edit).
    return rows.map(r => ({ ...r, preview: (r.content || '').slice(0, 240) }));
  },

  async createSource(d) {
    let content = d.content || '';
    // For URL sources, fetch + extract the page text now.
    if (d.type === 'url' && d.content) {
      try { content = await extract.fromUrl(d.content.trim()); } catch (e) { content = `(${e.message}) ${d.content}`; }
    }
    const [r] = await pool.query(
      `INSERT INTO ai_knowledge_sources (type, title, filename, content, is_active, char_count) VALUES (?, ?, ?, ?, ?, ?)`,
      [d.type || 'text', d.title, d.filename || null, content, d.isActive ? 1 : 0, content.length],
    );
    await this.reindexSource(r.insertId);
    return { id: r.insertId };
  },

  // Create a source from an uploaded file's extracted text.
  async createFromFile({ title, type, filename, text, isActive = true }) {
    const [r] = await pool.query(
      `INSERT INTO ai_knowledge_sources (type, title, filename, content, is_active, char_count) VALUES (?, ?, ?, ?, ?, ?)`,
      [type || 'text', title, filename || null, text || '', isActive ? 1 : 0, (text || '').length],
    );
    await this.reindexSource(r.insertId);
    return { id: r.insertId };
  },

  async updateSource(id, d) {
    let content = d.content || '';
    if (d.type === 'url' && d.content) {
      try { content = await extract.fromUrl(d.content.trim()); } catch (e) { content = `(${e.message}) ${d.content}`; }
    }
    const [r] = await pool.query(
      `UPDATE ai_knowledge_sources SET type = ?, title = ?, content = ?, is_active = ?, char_count = ? WHERE id = ?`,
      [d.type || 'text', d.title, content, d.isActive ? 1 : 0, content.length, id],
    );
    if (r.affectedRows === 0) return false;
    await this.reindexSource(id);
    return true;
  },

  // Active instruction sources — always injected into the system prompt.
  async getInstructions() {
    const [rows] = await pool.query(
      `SELECT content FROM ai_knowledge_sources WHERE type = 'instruction' AND is_active = 1 ORDER BY id ASC`,
    );
    return rows.map(r => r.content).join('\n');
  },

  async deleteSource(id) {
    const [old] = await pool.query(`SELECT id FROM ai_chunks WHERE source_id = ?`, [id]);
    if (old.length && vstore.pineconeReady()) await vstore.deleteByIds(old.map(o => o.id));
    const [r] = await pool.query(`DELETE FROM ai_knowledge_sources WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  },

  // ---------- Indexing ----------
  async reindexSource(id) {
    const [[src]] = await pool.query(`SELECT id, title, content FROM ai_knowledge_sources WHERE id = ? LIMIT 1`, [id]);
    if (!src) return { chunks: 0 };
    // Remove old chunks (and their Pinecone vectors) before re-chunking.
    const [old] = await pool.query(`SELECT id FROM ai_chunks WHERE source_id = ?`, [id]);
    await pool.query(`DELETE FROM ai_chunks WHERE source_id = ?`, [id]);
    if (old.length && vstore.pineconeReady()) await vstore.deleteByIds(old.map(o => o.id));

    const chunks = ai.chunkText(src.content);
    const vecs = await ai.embed(chunks, 'passage'); // null if embeddings unavailable
    const toUpsert = [];
    for (let i = 0; i < chunks.length; i++) {
      const [ins] = await pool.query(
        `INSERT INTO ai_chunks (source_id, chunk_index, text, embedding) VALUES (?, ?, ?, ?)`,
        [id, i, chunks[i], vecs ? JSON.stringify(vecs[i]) : null],
      );
      if (vecs && vstore.pineconeReady()) {
        toUpsert.push({ id: String(ins.insertId), values: vecs[i], metadata: { sourceId: id, sourceTitle: src.title || '', text: chunks[i] } });
      }
    }
    if (toUpsert.length) { try { await vstore.upsert(toUpsert); } catch (e) { /* keep DB cosine fallback */ } }
    await pool.query(`UPDATE ai_knowledge_sources SET chunk_count = ? WHERE id = ?`, [chunks.length, id]);
    return { chunks: chunks.length, embedded: Boolean(vecs), pinecone: vstore.pineconeReady() && !!vecs };
  },

  async reindexAll() {
    const [rows] = await pool.query(`SELECT id FROM ai_knowledge_sources WHERE is_active = 1`);
    let total = 0;
    for (const r of rows) { const res = await this.reindexSource(r.id); total += res.chunks; }
    return { sources: rows.length, chunks: total };
  },

  // ---------- Retrieval ----------
  // Returns top-k chunks for a query (vector similarity if available, else keyword).
  async retrieve(query, k = 4) {
    const [qVec] = (await ai.embed([query], 'query')) || [null];

    // Pinecone first (if configured).
    if (qVec && vstore.pineconeReady()) {
      try {
        const matches = await vstore.query(qVec, k);
        if (matches.length) return matches;
      } catch (e) { /* fall back to DB */ }
    }

    const [rows] = await pool.query(
      `SELECT c.id, c.text, c.embedding, s.title AS sourceTitle
       FROM ai_chunks c JOIN ai_knowledge_sources s ON s.id = c.source_id
       WHERE s.is_active = 1`,
    );
    if (!rows.length) return [];

    if (qVec) {
      const scored = rows
        .filter(r => r.embedding)
        .map(r => ({ text: r.text, sourceTitle: r.sourceTitle, score: ai.cosineSim(qVec, JSON.parse(r.embedding)) }))
        .sort((a, b) => b.score - a.score);
      if (scored.length) return scored.slice(0, k);
    }

    // Keyword fallback: score by shared word overlap.
    const words = query.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    const scored = rows.map(r => {
      const t = r.text.toLowerCase();
      const score = words.reduce((s, w) => s + (t.includes(w) ? 1 : 0), 0);
      return { text: r.text, sourceTitle: r.sourceTitle, score };
    }).filter(r => r.score > 0).sort((a, b) => b.score - a.score);
    return scored.slice(0, k);
  },

  // Full RAG answer for a question. Returns { answer, sources, mode }.
  async answer(question, history = []) {
    const tools = require('../services/aiTools');
    const [ctx, instructions, live] = await Promise.all([
      this.retrieve(question, 4),
      this.getInstructions(),
      tools.gather(question), // live GET-API data matching the query
    ]);
    const contextText = ctx.map((c, i) => `[${i + 1}] (${c.sourceTitle}) ${c.text}`).join('\n');
    const system = `You are the Vrindavan Companion, a warm, concise assistant for residents of the Yamuna Infra township. Answer using the knowledge + live data below when relevant; if they don't cover it, answer helpfully and briefly and suggest the right app section. Prefer LIVE DATA for current listings/prices/timings. Keep replies short.${instructions ? `\n\nADMIN INSTRUCTIONS (always follow):\n${instructions}` : ''}${live.text ? `\n\nLIVE DATA (real-time from the app):\n${live.text}` : ''}\n\nKNOWLEDGE:\n${contextText || '(none)'}`;
    const messages = [
      { role: 'system', content: system },
      ...history.slice(-6).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: question },
    ];
    const llm = await ai.chatComplete(messages);
    if (llm) return { answer: llm, sources: [...ctx.map(c => c.sourceTitle), ...live.used.map(u => `live:${u}`)], mode: live.used.length ? 'rag+live' : 'rag' };
    // Fallback: stitch the most relevant chunk(s) into a simple reply.
    if (ctx.length) {
      return { answer: ctx[0].text, sources: ctx.map(c => c.sourceTitle), mode: 'retrieval-only' };
    }
    return { answer: null, sources: [], mode: 'none' };
  },
};

module.exports = AdminAiModel;
