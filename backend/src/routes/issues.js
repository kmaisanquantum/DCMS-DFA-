const router = require('express').Router();
const { body, param, validationResult } = require('express-validator');
const db = require('../db/pool');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// POST /api/issues — Log a new issue/bottleneck
router.post('/', [
  body('request_id').isUUID(),
  body('dept_id').isUUID(),
  body('issue_type').isIn(['BOTTLENECK', 'DOCUMENTATION_MISSING', 'SLA_RISK']),
  body('description').trim().notEmpty(),
], validate, async (req, res, next) => {
  try {
    const { request_id, dept_id, issue_type, description } = req.body;
    const { rows: [issue] } = await db.query(`
      INSERT INTO issue_tracker (request_id, dept_id, issue_type, description)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [request_id, dept_id, issue_type, description]);
    res.status(201).json(issue);
  } catch (err) { next(err); }
});

// GET /api/issues — List all open issues for coordination meetings
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT i.*, d.dept_code, r.reference_number
      FROM issue_tracker i
      JOIN departments d ON i.dept_id = d.dept_id
      JOIN requests r ON i.request_id = r.request_id
      WHERE i.status = 'OPEN'
      ORDER BY i.created_at DESC
    `);
    res.json({ issues: rows });
  } catch (err) { next(err); }
});

// PUT /api/issues/:id/resolve
router.put('/:id/resolve', param('id').isUUID(), validate, async (req, res, next) => {
  try {
    const { rows: [resolved] } = await db.query(`
      UPDATE issue_tracker
      SET status = 'RESOLVED', resolved_at = NOW()
      WHERE issue_id = $1
      RETURNING *
    `, [req.params.id]);
    if (!resolved) return res.status(404).json({ error: 'Issue not found' });
    res.json(resolved);
  } catch (err) { next(err); }
});

module.exports = router;
