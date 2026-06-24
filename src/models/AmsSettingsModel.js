const { pool } = require('../config/db');

// AMS settings (Module 5.9). Small key/value store with a 60s in-memory cache so
// hot paths (lead create, unit hold, register) don't hit the DB each time.
const DEFAULTS = { hold_hours: '48', lock_days: '90', tds_percent: '5', self_registration: 'true' };

let cache = null;
let cachedAt = 0;
const TTL = 60 * 1000;

async function loadAll() {
  const [rows] = await pool.query(`SELECT setting_key AS k, setting_value AS v FROM ams_settings`);
  const map = { ...DEFAULTS };
  rows.forEach(r => { map[r.k] = r.v; });
  cache = map; cachedAt = Date.now();
  return map;
}

const AmsSettingsModel = {
  async getAll() {
    if (cache && Date.now() - cachedAt < TTL) return cache;
    return loadAll();
  },

  async get(key, fallback) {
    const all = await this.getAll();
    return all[key] != null ? all[key] : (fallback != null ? String(fallback) : DEFAULTS[key]);
  },

  async getNumber(key, fallback) {
    const v = Number(await this.get(key, fallback));
    return Number.isFinite(v) ? v : Number(fallback);
  },

  async getBool(key, fallback = true) {
    const v = await this.get(key, String(fallback));
    return String(v) === 'true';
  },

  async setMany(obj) {
    const entries = Object.entries(obj || {});
    for (const [k, v] of entries) {
      await pool.query(
        `INSERT INTO ams_settings (setting_key, setting_value) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [k, v == null ? null : String(v)],
      );
    }
    cache = null; // invalidate
    return this.getAll();
  },
};

module.exports = AmsSettingsModel;
