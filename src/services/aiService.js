const config = require('../config/env');

// Thin OpenAI-compatible client for NVIDIA NIM (or any compatible endpoint).
// All calls are server-side; keys never reach the app. Every function degrades
// gracefully so the chatbot keeps working even if the provider is unreachable.

function llmReady() {
  return Boolean(config.llm.baseUrl && config.llm.apiKey && config.llm.model && config.llm.provider !== 'mock');
}
function embeddingsReady() {
  return Boolean(config.embeddings.baseUrl && config.embeddings.apiKey && config.embeddings.model && config.embeddings.provider !== 'mock');
}

// Embed an array of strings → array of float vectors (or null on failure).
// NVIDIA's retrieval embeddings need an input_type ('passage' | 'query').
async function embed(texts, inputType = 'passage') {
  if (!embeddingsReady() || !texts.length) return null;
  try {
    const res = await fetch(`${config.embeddings.baseUrl}/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.embeddings.apiKey}` },
      body: JSON.stringify({
        model: config.embeddings.model,
        input: texts,
        input_type: inputType,
        encoding_format: 'float',
        truncate: 'END',
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data.map(d => d.embedding);
  } catch {
    return null;
  }
}

// Chat completion → assistant text (or null on failure).
async function chatComplete(messages, { temperature = 0.4, maxTokens = 500 } = {}) {
  if (!llmReady()) return null;
  try {
    const res = await fetch(`${config.llm.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.llm.apiKey}` },
      body: JSON.stringify({ model: config.llm.model, messages, temperature, max_tokens: maxTokens }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

function cosineSim(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

// Split text into ~maxLen-char chunks on sentence boundaries.
function chunkText(text, maxLen = 600) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean ? [clean] : [];
  const sentences = clean.match(/[^.!?]+[.!?]*/g) || [clean];
  const chunks = [];
  let cur = '';
  for (const s of sentences) {
    if ((cur + s).length > maxLen && cur) { chunks.push(cur.trim()); cur = ''; }
    cur += s;
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

module.exports = { embed, chatComplete, cosineSim, chunkText, llmReady, embeddingsReady };
