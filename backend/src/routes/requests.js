const router = require('express').Router();
const { body, query: qv, param, validationResult } = require('express-validator');
const db = require('../db/pool');
const { generateReferenceNumber } = require('../utils/crypto');
const { notifyDepartments } = require('../utils/mailer');
const logger = require('../utils/logger');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// POST /api/requests — submit new clearance request
router.post('/', [
  body('mission_id').isUUID(),
  body('vessel_type').isIn(['NAVAL_VESSEL','COAST_GUARD','RESEARCH_VESSEL','DIPLOMATIC_AIRCRAFT','MILITARY_AIRCRAFT','COMMERCIAL_CHARTER']),
  body('vessel_name').trim().notEmpty(),
  body('vessel_flag').trim().isLength({ min:2, max:3 }),
  body('port_of_entry').trim().notEmpty(),
  body('proposed_entry_date').isDate(),
  body('proposed_exit_date').isDate(),
  body('clearance_type').optional().isIn(['STANDARD','EMERGENCY']),
  body('emergency_reason').if(body('clearance_type').equals('EMERGENCY')).notEmpty(),
], validate, async (req, res, next) => {
  try {
    const {
      mission_id, vessel_type, vessel_name, vessel_flag, vessel_registration,
      vessel_tonnage, vessel_length_m, port_of_entry, port_of_exit,
      route_waypoints, intended_activities, proposed_entry_date, proposed_exit_date,
      total_crew, total_passengers, personnel_manifest, clearance_type, emergency_reason,
    } = req.body;

    const result = await db.transaction(async (client) => {
      const referenceNumber = await generateReferenceNumber(client);

      const { rows: [newRequest] } = await client.query(`
        INSERT INTO requests (
          reference_number, mission_id, vessel_type, vessel_name, vessel_flag,
          vessel_registration, vessel_tonnage, vessel_length_m, port_of_entry, port_of_exit,
          route_waypoints, intended_activities, proposed_entry_date, proposed_exit_date,
          total_crew, total_passengers, personnel_manifest, clearance_type, emergency_reason, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'SUBMITTED')
        RETURNING *
      `, [
        referenceNumber, mission_id, vessel_type, vessel_name, vessel_flag,
        vessel_registration||null, vessel_tonnage||null, vessel_length_m||null,
        port_of_entry, port_of_exit||null,
        JSON.stringify(route_waypoints||[]), intended_activities||null,
        proposed_entry_date, proposed_exit_date,
        total_crew||0, total_passengers||0,
        JSON.stringify(personnel_manifest||[]),
        clearance_type||'STANDARD', emergency_reason||null,
      ]);

      const { rows: departments } = await client.query(
        `SELECT dept_id, dept_code, dept_name, contact_email FROM departments
         WHERE is_mandatory = TRUE ORDER BY review_order`
      );

      const reviewRows = [];
      for (const dept of departments) {
        const { rows: [review] } = await client.query(
          `INSERT INTO department_reviews (request_id, dept_id) VALUES ($1,$2) RETURNING review_id`,
          [newRequest.request_id, dept.dept_id]
        );
        reviewRows.push({ ...review, ...dept });
      }

      const { rows: [mission] } = await client.query(
        `SELECT mission_name, country_name FROM missions WHERE mission_id = $1`, [mission_id]
      );

      return { newRequest, reviewRows, departments, mission };
    });

    setImmediate(() => notifyDepartments(db, result.reviewRows, {
      ...result.newRequest, ...result.mission
    }));

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
      `SELECT * FROM v_request_dashboard WHERE request_id = $1`, [req.params.id]
    );
    if (!request) return res.status(404).json({ error: 'Request not found' });

    const { rows: reviews } = await db.query(`
      SELECT dr.review_id, dr.status, dr.comments, dr.conditions,
             dr.reviewed_at, dr.notified_at, dr.assigned_to,
             d.dept_code, d.dept_name, d.is_mandatory
      FROM department_reviews dr
      JOIN departments d ON dr.dept_id = d.dept_id
      WHERE dr.request_id = $1
      ORDER BY d.review_order
    `, [req.params.id]);

    res.json({ ...request, reviews });
  } catch (err) { next(err); }
});

// GET /api/requests/:id/audit
router.get('/:id/audit', param('id').isUUID(), validate, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM audit_log WHERE entity_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json({ audit_trail: rows });
  } catch (err) { next(err); }
});

module.exports = router;
