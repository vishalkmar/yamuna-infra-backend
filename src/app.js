const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

app.use(helmet());
app.use(cors());

// Capture the raw body for HMAC-signed webhooks (Cashfree). Stored on
// req.rawBody as a string. The parsed JSON is still available on req.body.
app.use(
  express.json({
    limit: '2mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  }),
);
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Locally stored uploads (resident document PDFs). Served with a cross-origin
// resource policy so they can be previewed/embedded from the admin portal and
// fetched by document viewers. PDFs are served inline (no forced download).
app.use(
  '/uploads',
  express.static(path.join(__dirname, '../uploads'), {
    setHeaders: res => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
  }),
);

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', generalLimiter);

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many auth requests. Please wait a minute.' },
});
app.use('/api/auth', authLimiter);
app.use('/api/admin/auth', authLimiter);

// Root + /api index — friendly response so the base URL isn't a "Route not found".
const apiInfo = (req, res) =>
  res.json({
    success: true,
    service: 'Yamuna Infra API',
    status: 'running',
    health: '/api/health',
  });
app.get('/', apiInfo);
app.get('/api', apiInfo);

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
