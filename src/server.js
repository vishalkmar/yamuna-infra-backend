const app = require('./app');
const config = require('./config/env');
const { ping } = require('./config/db');

async function bootstrap() {
  try {
    await ping();
    console.log('[db] MySQL connection OK');
  } catch (err) {
    console.error('[db] MySQL connection failed:', err.message);
    console.error('     Make sure MySQL is running and .env credentials are correct.');
  }

  app.listen(config.port, () => {
    console.log(`[server] Yamuna Infra API running on http://localhost:${config.port}`);
    console.log(`[server] Health check: http://localhost:${config.port}/api/health`);
    console.log(`[server] Environment: ${config.env}`);
  });
}

bootstrap();

process.on('unhandledRejection', err => {
  console.error('[unhandledRejection]', err);
});
process.on('uncaughtException', err => {
  console.error('[uncaughtException]', err);
  process.exit(1);
});
