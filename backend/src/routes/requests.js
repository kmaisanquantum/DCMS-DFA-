const router = require('express').Router();
const { body, query: qv, param, validationResult } = require('express-validator');
const db = require('../db/pool');
const { generateReferenceNumber } = require('../utils/crypto');
const { notifyDepartments, notifyDFA_PPOC } = require('../utils/mailer');
const logger = require('../utils/logger');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// POST /api/requests — submit new clearance request
router.post('/', [
  body('mission_id').isUUID(),
  body('category_id').isUUID(),
  body('category_metadata').isObject(),
  body('port_of_entry').trim().notEmpty(),
  body('proposed_entry_date').isDate(),
  body('proposed_exit_date').isDate(),
  body('clearance_type').optional().isIn(['STANDARD','EMERGENCY']),
  body('emergency_reason').if(body('clearance_type').equals('EMERGENCY')).notEmpty(),
], validate, async (req, res, next) => {
  try {
    const {
      mission_id, category_id, category_metadata, is_emergency,
      port_of_entry, port_of_exit,
      route_waypoints, intended_activities, proposed_entry_date, proposed_exit_date,
      total_crew, total_passengers, personnel_manifest, clearance_type, emergency_reason,
    } = req.body;

    // 10-Day Rule Validation
    const entryDate = new Date(proposed_entry_date);
    const today = new Date();

    // Simple 10 working days approximation (approx 14 calendar days)
    // In a real system, we'd use a robust utility with holidays
    const diffTime = entryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 10 && clearance_type !== 'EMERGENCY') {
      return res.status(400).json({
        error: 'The 10-Day Rule: Standard requests must be submitted at least 10 working days before the planned activity. Please flag as "Emergency" if justified.',
        rule_violation: true
      });
    }

    const result = await db.transaction(async (client) => {
      const referenceNumber = await generateReferenceNumber(client);

      // Fetch category to get primary department and check security flags
      const { rows: [category] } = await client.query(
        `SELECT category_code, display_name, primary_dept_id FROM clearance_categories WHERE category_id = $1`,
        [category_id]
      );
      if (!category) throw new Error('Invalid category_id');

      const securityCoordRequired = ['HIGH_RISK_CARGO', 'FIREARMS'].includes(category.category_code);

      const { rows: [newRequest] } = await client.query(`
        INSERT INTO requests (
          reference_number, mission_id, category_id, category_metadata,
          vessel_name, security_coordination_required, is_emergency,
          port_of_entry, port_of_exit,
          route_waypoints, intended_activities, proposed_entry_date, proposed_exit_date,
          total_crew, total_passengers, personnel_manifest, clearance_type, emergency_reason, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'SUBMITTED')
        RETURNING *
      `, [
        referenceNumber, mission_id, category_id, JSON.stringify(category_metadata || {}),
        category_metadata?.vessel_name || category_metadata?.aircraft_type || category_metadata?.equipment_type || 'Diplomatic Request',
        securityCoordRequired, !!is_emergency,
        port_of_entry, port_of_exit||null,
        JSON.stringify(route_waypoints||[]), intended_activities||null,
        proposed_entry_date, proposed_exit_date,
        total_crew||0, total_passengers||0,
        JSON.stringify(personnel_manifest||[]),
        clearance_type||'STANDARD', emergency_reason||null,
      ]);

      const { rows: departments } = await client.query(
        `SELECT dept_id, dept_code, dept_name, contact_email FROM departments
         WHERE is_mandatory = TRUE OR dept_id = $1 OR dept_code = 'DFA'
         ORDER BY review_order`,
        [category.primary_dept_id]
      );

      const reviewRows = [];
      for (const dept of departments) {
        // Initial status is PENDING for all.
        // DFA will be the 'Initial Reviewer'
        const { rows: [review] } = await client.query(
        `INSERT INTO workflow_steps (request_id, dept_id) VALUES ($1,$2) RETURNING review_id`,
          [newRequest.request_id, dept.dept_id]
        );
        reviewRows.push({ ...review, ...dept });
      }

      const { rows: [mission] } = await client.query(
        `SELECT mission_name, country_name FROM missions WHERE mission_id = $1`, [mission_id]
      );

      return { newRequest, reviewRows, departments, mission, category };
    });

    setImmediate(async () => {
      // Notify DFA PPOC immediately to begin 'Initial Review'
      await notifyDFA_PPOC(db, {
        ...result.newRequest, ...result.mission
      }, result.category.display_name);

      // Emergency logic: Notify ALL agencies immediately and move to UNDER_REVIEW
      if (result.newRequest.is_emergency || clearance_type === 'EMERGENCY') {
        await db.query(
          "UPDATE requests SET status = 'UNDER_REVIEW' WHERE request_id = $1",
          [result.newRequest.request_id]
        );
        // Add "HOD Escalation" tag to notifications if needed
        await notifyDepartments(db, result.reviewRows, {
          ...result.newRequest, ...result.mission, escalation: true
        });
      }
    });

    logger.info(`New request submitted: ${result.newRequest.reference_number}`);
    res.status(201).json({
      message: 'Request submitted. All departments have been notified.',
      request_id: result.newRequest.request_id,
      reference_number: result.newRequest.reference_number,
      review_deadline: result.newRequest.review_deadline,
      clearance_type: result.newRequest.clearance_type,
      departments_notified: result.departments.map(d => d.dept_code),
    });
  } catch (err) { next(err); }
});

// GET /api/requests — list with filters
router.get('/', async (req, res, next) => {
  try {
    const { status, mission_id, limit = 50, offset = 0 } = req.query;
    const conditions = [];
    const params = [];
    if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
    if (mission_id) { params.push(mission_id); conditions.push(`mission_id = $${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(parseInt(limit), parseInt(offset));
    const { rows } = await db.query(
      `SELECT * FROM v_request_dashboard ${where}
       ORDER BY submitted_at DESC NULLS LAST
       LIMIT $${params.length-1} OFFSET $${params.length}`,
      params
    );
    res.json({ requests: rows, count: rows.length });
  } catch (err) { next(err); }
});

// GET /api/requests/:id — single request with reviews
router.get('/:id', param('id').isUUID(), validate, async (req, res, next) => {
  try {
    const { rows: [request] } = await db.query(
      `SELECT r.*, c.display_name AS category_name, c.metadata_schema, m.mission_name, m.country_name,
              cl.clearance_id, cl.clearance_number, cl.digital_hash, cl.qr_payload, cl.issued_at
       FROM requests r
       JOIN missions m ON r.mission_id = m.mission_id
       JOIN clearance_categories c ON r.category_id = c.category_id
       LEFT JOIN clearance_log cl ON r.request_id = cl.request_id
       WHERE r.request_id = $1`, [req.params.id]
    );
    if (!request) return res.status(404).json({ error: 'Request not found' });

    const { rows: reviews } = await db.query(`
      SELECT dr.review_id, dr.status, dr.comments, dr.conditions,
             dr.reviewed_at, dr.notified_at, dr.assigned_to,
             d.dept_code, d.dept_name, d.is_mandatory
      FROM workflow_steps dr
      JOIN departments d ON dr.dept_id = d.dept_id
      WHERE dr.request_id = $1
      ORDER BY d.review_order
    `, [req.params.id]);

    const clearance = request.clearance_id ? {
      clearance_id: request.clearance_id,
      clearance_number: request.clearance_number,
      digital_hash: request.digital_hash,
      qr_payload: request.qr_payload,
      issued_at: request.issued_at
    } : null;

    res.json({ ...request, reviews, clearance });
  } catch (err) { next(err); }
});

// GET /api/requests/:id/audit
router.get('/:id/audit', param('id').isUUID(), validate, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM system_logs WHERE entity_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json({ audit_trail: rows });
  } catch (err) { next(err); }
});

module.exports = router;
