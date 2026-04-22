require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const logger = require('./utils/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const requestsRouter   = require('./routes/requests');
const reviewsRouter    = require('./routes/reviews');
const clearancesRouter = require('./routes/clearances');
const missionsRouter   = require('./routes/missions');

const app = express();

// ── Security ──────────────────────────────────
app.use(helmet());
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

// ── Error handling ─────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start ──────────────────────────────────────
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  logger.info(`DCMS API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down gracefully');
  server.close(() => process.exit(0));
});

module.exports = app;
