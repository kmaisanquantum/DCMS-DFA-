const { Pool } = require('pg');
const logger = require('../utils/logger');

const connectionString = process.env.DATABASE_URL;
const isRenderDB = connectionString && connectionString.includes('render.com');

const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: (process.env.NODE_ENV === 'production' || isRenderDB)
    ? { rejectUnauthorized: false }
    : false,
});

pool.on('error', (err) => {
  logger.error('Unexpected database pool error', err);
});

pool.on('connect', () => {
  logger.debug('New database connection established');
});

const query = (text, params) => pool.query(text, params);

const getClient = () => pool.connect();

const transaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { query, getClient, transaction, pool };
