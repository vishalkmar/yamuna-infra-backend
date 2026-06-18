require('dotenv').config();

const required = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    console.warn(`[env] Missing ${key} — please set it in .env`);
  }
}

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),

  db: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // Admin portal auth — separate from resident OTP tokens. Falls back to the
  // resident JWT secret if a dedicated one isn't set.
  adminJwt: {
    secret: process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'dev-admin-secret-change-me',
    expiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '12h',
  },

  otp: {
    length: parseInt(process.env.OTP_LENGTH || '6', 10),
    ttlSeconds: parseInt(process.env.OTP_TTL_SECONDS || '300', 10),
  },

  sms: {
    provider: process.env.SMS_PROVIDER || 'console',
    apiKey: process.env.SMS_API_KEY,
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: String(process.env.SMTP_SECURE || 'true') === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
  },

  // Brevo HTTP email API — primary transport (works where SMTP is blocked).
  brevo: {
    apiKey: process.env.BREVO_API_KEY,
  },

  // Sender for outgoing email (must be a verified sender in Brevo).
  // Accepts "Name <email>" or a plain email.
  email: {
    from: process.env.EMAIL_FROM || process.env.SMTP_FROM
      || 'Shri Yamuna Infra <traveonventures@gmail.com>',
  },

  app: {
    baseUrl: process.env.APP_BASE_URL || 'http://localhost:4000',
    mobileScheme: process.env.MOBILE_APP_SCHEME || 'yamunainfra',
  },

  // Cloudinary — signed uploads from the admin portal (key stays server-side).
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    folder: process.env.CLOUDINARY_FOLDER || 'yamuna',
  },

  // LLM + embeddings for the AI Concierge (Module A15). NVIDIA NIM is
  // OpenAI-compatible. Keys stay server-side (never exposed to the app).
  llm: {
    provider: process.env.LLM_PROVIDER || 'mock',
    baseUrl: process.env.LLM_BASE_URL,
    apiKey: process.env.LLM_API_KEY,
    model: process.env.LLM_MODEL,
  },
  embeddings: {
    provider: process.env.EMBEDDINGS_PROVIDER || process.env.LLM_PROVIDER || 'mock',
    baseUrl: process.env.EMBEDDINGS_BASE_URL || process.env.LLM_BASE_URL,
    apiKey: process.env.EMBEDDINGS_API_KEY || process.env.LLM_API_KEY,
    model: process.env.EMBEDDINGS_MODEL || 'nvidia/nv-embedqa-e5-v5',
    dim: parseInt(process.env.EMBEDDINGS_DIM || '1024', 10), // nv-embedqa-e5-v5 = 1024
  },

  // Pinecone vector DB (optional). When set, RAG retrieval uses Pinecone instead
  // of the in-DB cosine fallback.
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY,
    index: process.env.PINECONE_INDEX || 'yamunainfra',
    cloud: process.env.PINECONE_CLOUD || 'aws',
    region: process.env.PINECONE_REGION || 'us-east-1',
  },

  cashfree: {
    env: (process.env.CASHFREE_ENV || process.env.CASHFREE_MODE || 'sandbox').toLowerCase() === 'test'
      ? 'sandbox'
      : (process.env.CASHFREE_ENV || process.env.CASHFREE_MODE || 'sandbox').toLowerCase(),
    appId: process.env.CASHFREE_APP_ID,
    // Accept both naming conventions
    secretKey: process.env.CASHFREE_SECRET_KEY || process.env.CASHFREE_APP_SECRET,
    apiVersion: process.env.CASHFREE_API_VERSION || '2023-08-01',
    webhookSecret:
      process.env.CASHFREE_WEBHOOK_SECRET ||
      process.env.CASHFREE_SECRET_KEY ||
      process.env.CASHFREE_APP_SECRET,
    apiBase:
      process.env.CASHFREE_API_URL ||
      ((process.env.CASHFREE_ENV || 'sandbox') === 'production'
        ? 'https://api.cashfree.com/pg'
        : 'https://sandbox.cashfree.com/pg'),
  },
};
