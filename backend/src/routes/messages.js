const router = require('express').Router();
const { body, param, validationResult } = require('express-validator');
const db = require('../db/pool');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// POST /api/messages — Send internal message
router.post('/', [
  body('request_id').isUUID(),
  body('sender_dept_id').isUUID(),
  body('sender_name').trim().notEmpty(),
  body('message_text').trim().notEmpty(),
], validate, async (req, res, next) => {
  try {
    const { request_id, sender_dept_id, sender_name, message_text } = req.body;
    const { rows: [msg] } = await db.query(`
      INSERT INTO internal_messages (request_id, sender_dept_id, sender_name, message_text)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [request_id, sender_dept_id, sender_name, message_text]);
    res.status(201).json(msg);
  } catch (err) { next(err); }
});

// GET /api/messages/:requestId — List messages for a request
router.get('/:requestId', param('requestId').isUUID(), validate, async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT m.*, d.dept_code, d.dept_name
      FROM internal_messages m
      JOIN departments d ON m.sender_dept_id = d.dept_id
      WHERE m.request_id = $1
      ORDER BY m.created_at ASC
    `, [req.params.requestId]);
    res.json({ messages: rows });
  } catch (err) { next(err); }
});

module.exports = router;
