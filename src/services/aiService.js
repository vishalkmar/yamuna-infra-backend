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

// Every upstream call is time-boxed. Without this a model that has been retired
// (NIM keeps accepting the request and never answers) hangs the resident's chat
// request forever instead of falling back.
async function postJson(url, apiKey, body, timeoutMs) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal: ac.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function reason(e) {
  return e.name === 'AbortError' ? 'timeout' : e.message;
}

// Embed an array of strings → array of float vectors (or null on failure).
// NVIDIA's retrieval embeddings need an input_type ('passage' | 'query').
async function embed(texts, inputType = 'passage') {
  if (!embeddingsReady() || !texts.length) return null;
  try {
    const res = await postJson(
      `${config.embeddings.baseUrl}/embeddings`,
      config.embeddings.apiKey,
      {
        model: config.embeddings.model,
        input: texts,
        input_type: inputType,
        encoding_format: 'float',
        truncate: 'END',
      },
      config.embeddings.timeoutMs,
    );
    if (!res.ok) {
      console.warn(`[ai] embeddings ${config.embeddings.model} -> HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    return data.data.map(d => d.embedding);
  } catch (e) {
    console.warn(`[ai] embeddings ${config.embeddings.model} -> ${reason(e)}`);
    return null;
  }
}

// One chat attempt against a single model. Returns text, or null if the model
// failed / timed out / answered with nothing usable.
async function chatOnce(model, messages, temperature, maxTokens) {
  try {
    const res = await postJson(
      `${config.llm.baseUrl}/chat/completions`,
      config.llm.apiKey,
      { model, messages, temperature, max_tokens: maxTokens },
      config.llm.timeoutMs,
    );
    if (!res.ok) {
      console.warn(`[ai] chat ${model} -> HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    // Reasoning-style models put their thinking in `reasoning_content` and can
    // leave `content` empty — that is a miss, not an answer, so try the next model.
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      console.warn(`[ai] chat ${model} -> empty content`);
      return null;
    }
    return text;
  } catch (e) {
    console.warn(`[ai] chat ${model} -> ${reason(e)}`);
    return null;
  }
}

// Chat completion → assistant text (or null if every configured model failed).
// Walks the primary model then each fallback, so one retired model on the
// provider's side can't take the whole concierge down.
async function chatComplete(messages, { temperature = 0.4, maxTokens = 500 } = {}) {
  if (!llmReady()) return null;
  const chain = [config.llm.model, ...config.llm.fallbackModels].filter(
    (m, i, a) => m && a.indexOf(m) === i,
  );
  for (const model of chain) {
    const text = await chatOnce(model, messages, temperature, maxTokens);
    if (text) {
      if (model !== config.llm.model) console.warn(`[ai] chat served by fallback model ${model}`);
      return text;
    }
  }
  console.warn(`[ai] chat: all models failed (${chain.join(', ')})`);
  return null;
}

// Diagnostics for the admin console: does each leg of the AI stack actually
// answer right now? Never throws.
async function health() {
  const out = {
    llmReady: llmReady(),
    embeddingsReady: embeddingsReady(),
    baseUrl: config.llm.baseUrl || null,
    models: [],
    embeddings: { model: config.embeddings.model, ok: false, dim: null, ms: null },
  };
  const chain = [config.llm.model, ...config.llm.fallbackModels].filter(
    (m, i, a) => m && a.indexOf(m) === i,
  );
  for (const model of chain) {
    const t0 = Date.now();
    const text = llmReady()
      ? await chatOnce(model, [{ role: 'user', content: 'Reply with exactly: PONG' }], 0, 16)
      : null;
    out.models.push({
      model,
      primary: model === config.llm.model,
      ok: Boolean(text),
      ms: Date.now() - t0,
      sample: text ? text.slice(0, 80) : null,
    });
  }
  const t0 = Date.now();
  const vec = await embed(['health check'], 'query');
  out.embeddings.ok = Boolean(vec);
  out.embeddings.dim = vec ? vec[0].length : null;
  out.embeddings.ms = Date.now() - t0;
  return out;
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

module.exports = { embed, chatComplete, cosineSim, chunkText, llmReady, embeddingsReady, health };
