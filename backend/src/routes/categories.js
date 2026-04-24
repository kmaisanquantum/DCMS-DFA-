const router = require('express').Router();
const db = require('../db/pool');

// GET /api/categories — list all active clearance categories
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT category_id, category_code, display_name, metadata_schema FROM clearance_categories WHERE is_active = TRUE ORDER BY display_name'
    );
    res.json({ categories: rows });
  } catch (err) { next(err); }
});

module.exports = router;
