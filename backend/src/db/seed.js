const { pool } = require('./pool');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

async function seed() {
  const seedFile = path.join(__dirname, '../../../database/seeds/001_demo_data.sql');
  const sql = fs.readFileSync(seedFile, 'utf8');

  const client = await pool.connect();
  try {
    logger.info('Running demo data seed...');
    await client.query(sql);
    logger.info('Seeding complete.');
  } catch (err) {
    logger.error('Seeding failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seed().then(() => {
    logger.info('Seed script finished successfully');
    process.exit(0);
  }).catch(err => {
    logger.error('Seed script failed', err);
    process.exit(1);
  });
}

module.exports = seed;
