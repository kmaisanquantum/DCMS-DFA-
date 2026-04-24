const router = require('express').Router();
const { body, param, validationResult } = require('express-validator');
const db = require('../db/pool');
const { notifyDepartments } = require('../utils/mailer');

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
  body('assessment_data').optional().isObject(),
  body('assigned_to').optional().trim(),
], validate, async (req, res, next) => {
  try {
    const { status, comments, conditions, assessment_data, assigned_to } = req.body;

    const result = await db.transaction(async (client) => {
      // 1. Fetch current review details including dept and request info
      const { rows: [review] } = await client.query(`
        SELECT ws.*, d.dept_code, r.status as request_status, r.reference_number, r.vessel_name, r.is_emergency,
               m.mission_name, m.country_name, r.proposed_entry_date, r.clearance_type, r.review_deadline
        FROM workflow_steps ws
        JOIN departments d ON ws.dept_id = d.dept_id
        JOIN requests r ON ws.request_id = r.request_id
        JOIN missions m ON r.mission_id = m.mission_id
        WHERE ws.review_id = $1
      `, [req.params.id]);

      if (!review) throw Object.assign(new Error('Review not found'), { status: 404 });

      // 2. Perform the update
      const { rows: [updated] } = await client.query(`
        UPDATE workflow_steps
        SET status=$1, comments=$2, conditions=$3, assessment_data=$4, assigned_to=$5
        WHERE review_id=$6
        RETURNING *
      `, [status, comments||null, conditions||null, JSON.stringify(assessment_data||{}), assigned_to||null, req.params.id]);

      // 3. If DFA Approves Initial Review, move to UNDER_REVIEW and notify other agencies
      if (review.dept_code === 'DFA' && status === 'APPROVED' && review.request_status === 'SUBMITTED') {
        await client.query(
          "UPDATE requests SET status = 'UNDER_REVIEW' WHERE request_id = $1",
          [updated.request_id]
        );

        // Fetch other pending mandatory/relevant reviews to notify
        const { rows: otherReviews } = await client.query(`
          SELECT ws.*, d.dept_code, d.dept_name, d.contact_email
          FROM workflow_steps ws
          JOIN departments d ON ws.dept_id = d.dept_id
          WHERE ws.request_id = $1 AND d.dept_code != 'DFA'
        `, [updated.request_id]);

        return { updated, notify: true, reviews: otherReviews, request: review };
      }

      return { updated, notify: false };
    });

    if (result.notify) {
      setImmediate(() => notifyDepartments(db, result.reviews, result.request));
    }

    // Check if the request is now APPROVED to notify DFA PPOC for final issuance
    const { rows: [finalCheck] } = await db.query(
      "SELECT status, reference_number, mission_id FROM requests WHERE request_id = $1",
      [result.updated.request_id]
    );
    if (finalCheck && finalCheck.status === 'APPROVED') {
       // Notify DFA PPOC for final issuance SLA
       setImmediate(() => notifyDFA_PPOC(db, {
         request_id: result.updated.request_id,
         reference_number: finalCheck.reference_number
       }, 'Final Clearance Issuance Pending'));
    }

    res.json({ message: 'Review updated', review: result.updated });
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
