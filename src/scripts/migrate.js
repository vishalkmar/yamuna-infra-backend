// Runs all .sql files in /migrations sequentially, in filename order.
// Tracks applied migrations in `schema_migrations` so each file runs at most once.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');
const config = require('../config/env');

const TRACK_TABLE_DDL = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename    VARCHAR(120) NOT NULL,
    checksum    CHAR(64)     NOT NULL,
    applied_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (filename)
  ) ENGINE=InnoDB;
`;

async function run() {
  const dir = path.join(__dirname, '..', '..', 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();

  if (files.length === 0) {
    console.log('[migrate] No migration files found.');
    return;
  }

  const conn = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    multipleStatements: true,
  });
  console.log(`[migrate] Target database: ${config.db.database}`);

  await conn.query(TRACK_TABLE_DDL);
  const [applied] = await conn.query('SELECT filename, checksum FROM schema_migrations');
  const appliedMap = new Map(applied.map(r => [r.filename, r.checksum]));

  let appliedCount = 0;
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const sql = fs.readFileSync(fullPath, 'utf8');
    const checksum = crypto.createHash('sha256').update(sql).digest('hex');

    if (appliedMap.has(file)) {
      if (appliedMap.get(file) !== checksum) {
        console.warn(`[migrate] ⚠  ${file} already applied but checksum changed (file was edited after applying).`);
      } else {
        console.log(`[migrate] ✓ ${file} (already applied)`);
      }
      continue;
    }

    console.log(`[migrate] → applying ${file}`);
    await conn.query(sql);
    await conn.query('INSERT INTO schema_migrations (filename, checksum) VALUES (?, ?)', [file, checksum]);
    appliedCount++;
  }

  await conn.end();
  console.log(`[migrate] Done ✓ (${appliedCount} new, ${files.length - appliedCount} skipped)`);
}

run().catch(err => {
  console.error('[migrate] Failed:', err.message);
  process.exit(1);
});
