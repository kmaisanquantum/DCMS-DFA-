const { pool } = require('./pool');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

async function migrate() {
  const migrationsDir = path.join(__dirname, '../../../database/migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        run_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (const file of files) {
      const { rows } = await client.query(
        'SELECT id FROM _migrations WHERE filename = $1', [file]
      );
      if (rows.length > 0) {
        continue;
      }
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      logger.info(`Running migration: ${file}`);
      await client.query(sql);
      await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
    }
    logger.info('All migrations complete.');
  } catch (err) {
    logger.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrate().then(() => {
    logger.info('Migration script finished successfully');
    process.exit(0);
  }).catch(err => {
    logger.error('Migration script failed', err);
    process.exit(1);
  });
}

module.exports = migrate;
