require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const logger = require('./utils/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const requestsRouter   = require('./routes/requests');
const reviewsRouter    = require('./routes/reviews');
const clearancesRouter = require('./routes/clearances');
const missionsRouter   = require('./routes/missions');
const reportsRouter    = require('./routes/reports');

const app = express();
app.set('trust proxy', 1);

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
  origin: true,
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
const buildPath = path.resolve(__dirname, '../../frontend/build');
logger.info(`Static files directory check: ${buildPath}`);
if (fs.existsSync(buildPath)) {
  logger.info(`Build directory exists. Files: ${fs.readdirSync(buildPath).join(', ')}`);
  app.use(express.static(buildPath));
} else {
  logger.warn('Build directory does not exist yet. Frontend will not be served.');
}

// ── API Routes ─────────────────────────────────
app.get('/health', (req, res) =>
  res.json({ status: 'ok', system: 'DCMS-PNG', env: process.env.NODE_ENV, ts: new Date() })
);

app.use('/api/requests',   requestsRouter);
app.use('/api/reviews',    reviewsRouter);
app.use('/api/clearances', clearancesRouter);
app.use('/api/missions',   missionsRouter);
app.use('/api/reports',    reportsRouter);

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
  const indexPath = path.join(buildPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Frontend not found', path: indexPath });
  }
});

// ── Error handling ─────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start & Migration ──────────────────────────
const PORT = process.env.PORT || 3001;
const migrate = require('./db/migrate-on-start');

const server = app.listen(PORT, () => {
  logger.info(`DCMS API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  logger.info(`CWD: ${process.cwd()}`);

  // Run migrations asynchronously after server starts
  migrate()
    .then(() => logger.info('Database migrations completed successfully.'))
    .catch(err => logger.error('Database migration failed (non-fatal for web server)', err));
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down gracefully');
  server.close(() => process.exit(0));
});

module.exports = app;
