require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const logger = require('./utils/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const requestsRouter   = require('./routes/requests');
const reviewsRouter    = require('./routes/reviews');
const clearancesRouter = require('./routes/clearances');
const missionsRouter   = require('./routes/missions');

const app = express();

// ── Security ──────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "blob:"],
      "script-src": ["'self'", "'unsafe-inline'"],
    },
  },
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// ── Rate limiting ──────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ── Parsing & logging ──────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));

// ── Static Files ───────────────────────────────
app.use(express.static(path.join(__dirname, '../../frontend/build')));

// ── Routes ─────────────────────────────────────
app.get('/health', (req, res) =>
  res.json({ status: 'ok', system: 'DCMS-PNG', env: process.env.NODE_ENV, ts: new Date() })
);

app.use('/api/requests',   requestsRouter);
app.use('/api/reviews',    reviewsRouter);
app.use('/api/clearances', clearancesRouter);
app.use('/api/missions',   missionsRouter);

// ── Departments (read-only) ────────────────────
const db = require('./db/pool');
app.get('/api/departments', async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM departments ORDER BY review_order');
    res.json({ departments: rows });
  } catch (err) { next(err); }
});

// ── Frontend SPA Catch-all ─────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/build/index.html'));
});

// ── Error handling ─────────────────────────────
// (Note: notFound will only trigger for non-GET requests since the catch-all handles all GETs)
app.use(notFound);
app.use(errorHandler);

// ── Start ──────────────────────────────────────
const PORT = process.env.PORT || 3001;
const migrate = require('./db/migrate-on-start');

migrate().then(() => {
  const server = app.listen(PORT, () => {
    logger.info(`DCMS API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received — shutting down gracefully');
    server.close(() => process.exit(0));
  });
}).catch(err => {
  logger.error('Migration failed on start', err);
  process.exit(1);
});

module.exports = app;
