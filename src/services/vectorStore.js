// Pinecone vector store (Module A15). Optional: when PINECONE_API_KEY is set,
// RAG retrieval uses Pinecone; otherwise the caller falls back to in-DB cosine.
const config = require('../config/env');

let _client = null;
let _indexReady = false;

function pineconeReady() {
  return Boolean(config.pinecone.apiKey);
}

function client() {
  if (_client) return _client;
  const { Pinecone } = require('@pinecone-database/pinecone');
  _client = new Pinecone({ apiKey: config.pinecone.apiKey });
  return _client;
}

// Create the index on first use if it doesn't exist (serverless).
async function ensureIndex() {
  if (_indexReady) return;
  const pc = client();
  const name = config.pinecone.index;
  const existing = await pc.listIndexes();
  const found = (existing.indexes || []).some(i => i.name === name);
  if (!found) {
    await pc.createIndex({
      name,
      dimension: config.embeddings.dim,
      metric: 'cosine',
      spec: { serverless: { cloud: config.pinecone.cloud, region: config.pinecone.region } },
    });
    // Wait for it to become ready.
    for (let i = 0; i < 30; i++) {
      const d = await pc.describeIndex(name);
      if (d.status?.ready) break;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  _indexReady = true;
}

function idx() {
  return client().index(config.pinecone.index);
}

// items: [{ id, values:[...], metadata:{ sourceId, sourceTitle, text } }]
async function upsert(items) {
  if (!items.length) return;
  await ensureIndex();
  await idx().upsert(items);
}

async function deleteByIds(ids) {
  if (!ids.length) return;
  try { await ensureIndex(); await idx().deleteMany(ids.map(String)); } catch (_) { /* ignore */ }
}

// Returns [{ text, sourceTitle, score }]
async function query(vector, topK = 4) {
  await ensureIndex();
  const res = await idx().query({ vector, topK, includeMetadata: true });
  return (res.matches || []).map(m => ({
    text: m.metadata?.text || '',
    sourceTitle: m.metadata?.sourceTitle || '',
    score: m.score,
  }));
}

module.exports = { pineconeReady, ensureIndex, upsert, deleteByIds, query };
