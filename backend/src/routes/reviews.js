const router = require('express').Router();
const { body, param, validationResult } = require('express-validator');
const db = require('../db/pool');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// PUT /api/reviews/:id — department submits decision
router.put('/:id', [
  param('id').isUUID(),
  body('status').isIn(['APPROVED','REJECTED','INFORMATION_REQUESTED']),
  body('comments').optional().trim(),
  body('conditions').optional().trim(),
  body('assigned_to').optional().trim(),
], validate, async (req, res, next) => {
  try {
    const { status, comments, conditions, assigned_to } = req.body;
    const { rows: [updated] } = await db.query(`
      UPDATE workflow_steps
      SET status=$1, comments=$2, conditions=$3, assigned_to=$4
      WHERE review_id=$5
      RETURNING *
    `, [status, comments||null, conditions||null, assigned_to||null, req.params.id]);

    if (!updated) return res.status(404).json({ error: 'Review not found' });
    res.json({ message: 'Review updated', review: updated });
  } catch (err) { next(err); }
});

// GET /api/reviews/:id — get single review
router.get('/:id', param('id').isUUID(), validate, async (req, res, next) => {
  try {
    const { rows: [review] } = await db.query(`
      SELECT dr.*, d.dept_code, d.dept_name, r.reference_number, r.vessel_name
      FROM workflow_steps dr
      JOIN departments d ON dr.dept_id = d.dept_id
      JOIN requests r ON dr.request_id = r.request_id
      WHERE dr.review_id = $1
    `, [req.params.id]);
    if (!review) return res.status(404).json({ error: 'Review not found' });
    res.json(review);
  } catch (err) { next(err); }
});

module.exports = router;
