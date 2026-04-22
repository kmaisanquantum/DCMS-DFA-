const router = require('express').Router();
const { body, param, validationResult } = require('express-validator');
const db = require('../db/pool');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM missions WHERE is_active = TRUE ORDER BY country_name`
    );
    res.json({ missions: rows });
  } catch (err) { next(err); }
});

router.post('/', [
  body('mission_name').trim().notEmpty(),
  body('country_code').trim().isLength({ min:2, max:3 }),
  body('country_name').trim().notEmpty(),
  body('contact_email').isEmail(),
], validate, async (req, res, next) => {
  try {
    const { mission_name, country_code, country_name, ambassador_name, contact_email, contact_phone, address } = req.body;
    const { rows: [mission] } = await db.query(`
      INSERT INTO missions (mission_name, country_code, country_name, ambassador_name, contact_email, contact_phone, address)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [mission_name, country_code.toUpperCase(), country_name, ambassador_name||null, contact_email, contact_phone||null, address||null]);
    res.status(201).json(mission);
  } catch (err) { next(err); }
});

router.get('/:id', param('id').isUUID(), validate, async (req, res, next) => {
  try {
    const { rows: [mission] } = await db.query(
      `SELECT * FROM missions WHERE mission_id = $1`, [req.params.id]
    );
    if (!mission) return res.status(404).json({ error: 'Mission not found' });
    res.json(mission);
  } catch (err) { next(err); }
});

module.exports = router;
