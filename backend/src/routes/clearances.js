const router = require('express').Router();
const { body, param, validationResult } = require('express-validator');
const db = require('../db/pool');
const { generateDigitalHash, buildQRPayload, generateClearanceNumber } = require('../utils/crypto');
const logger = require('../utils/logger');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// POST /api/clearances — DFA issues final clearance
router.post('/', [
  body('request_id').isUUID(),
  body('issued_by_officer').trim().notEmpty(),
  body('letter_hash').optional().trim(),
  body('conditions').optional().trim(),
], validate, async (req, res, next) => {
  try {
    const { request_id, issued_by_officer, letter_hash, conditions } = req.body;

    const result = await db.transaction(async (client) => {
      const { rows: [request] } = await client.query(
        `SELECT * FROM requests WHERE request_id = $1 FOR UPDATE`, [request_id]
      );
      if (!request) throw Object.assign(new Error('Request not found'), { status: 404 });
      if (request.status !== 'APPROVED') {
        throw Object.assign(
          new Error(`Cannot issue clearance. Status is '${request.status}'. All mandatory agencies must approve first.`),
          { status: 422 }
        );
      }

      const { rows: [dfa] } = await client.query(
        `SELECT dept_id FROM departments WHERE dept_code = 'DFA'`
      );
      const issuedAt = new Date().toISOString();
      const clearanceNumber = await generateClearanceNumber(client);
      const digitalHash = generateDigitalHash(clearanceNumber, request_id, issuedAt);
      const qrPayload = buildQRPayload(
        clearanceNumber, digitalHash,
        request.proposed_entry_date, request.proposed_exit_date,
        letter_hash
      );

      const { rows: [clearance] } = await client.query(`
        INSERT INTO clearance_log
          (request_id, issued_by_dept_id, clearance_number, digital_hash, letter_hash, qr_payload,
           valid_from, valid_until, conditions, issued_by_officer)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING *
      `, [
        request_id, dfa.dept_id, clearanceNumber, digitalHash, letter_hash||null, qrPayload,
        request.proposed_entry_date, request.proposed_exit_date,
        conditions||null, issued_by_officer,
      ]);

      return clearance;
    });

    logger.info(`Clearance issued: ${result.clearance_number}`);
    res.status(201).json({
      message: 'Final clearance issued successfully.',
      clearance_id: result.clearance_id,
      clearance_number: result.clearance_number,
      digital_hash: result.digital_hash,
      qr_payload: result.qr_payload,
      valid_from: result.valid_from,
      valid_until: result.valid_until,
    });
  } catch (err) { next(err); }
});

// GET /api/clearances/verify/:hash — QR verification (public)
router.get('/verify/:hash', async (req, res, next) => {
  try {
    const { rows: [c] } = await db.query(
      `SELECT * FROM v_clearance_verify WHERE digital_hash = $1`, [req.params.hash]
    );
    if (!c) {
      return res.status(404).json({
        valid: false, status: 'NOT_FOUND',
        error: 'Clearance not found. This QR code may be fraudulent.',
      });
    }
    const today = new Date().toISOString().split('T')[0];
    const status = c.is_revoked ? 'REVOKED'
                 : c.valid_until < today ? 'EXPIRED'
                 : c.valid_from > today  ? 'NOT_YET_VALID'
                 :                          'VALID';
    res.json({
      valid: status === 'VALID', status,
      clearance_number: c.clearance_number,
      letter_hash: c.letter_hash,
      vessel: { name: c.vessel_name, type: c.vessel_type, flag: c.vessel_flag, registration: c.vessel_registration },
      route: { port_of_entry: c.port_of_entry, port_of_exit: c.port_of_exit, waypoints: c.route_waypoints },
      mission: { name: c.mission_name, country: c.country_name },
      validity: { from: c.valid_from, until: c.valid_until, issued_at: c.issued_at, issued_by: c.issued_by_officer },
      personnel: { crew: c.total_crew, passengers: c.total_passengers, manifest: c.personnel_manifest },
      conditions: c.conditions,
    });
  } catch (err) { next(err); }
});

// POST /api/clearances/:id/revoke
router.post('/:id/revoke', [
  param('id').isUUID(),
  body('reason').trim().notEmpty(),
], validate, async (req, res, next) => {
  try {
    const { rows: [revoked] } = await db.query(`
      UPDATE clearance_log
      SET is_revoked=TRUE, revoked_at=NOW(), revocation_reason=$1
      WHERE clearance_id=$2
      RETURNING clearance_number
    `, [req.body.reason, req.params.id]);
    if (!revoked) return res.status(404).json({ error: 'Clearance not found' });
    logger.warn(`Clearance revoked: ${revoked.clearance_number}`);
    res.json({ message: `Clearance ${revoked.clearance_number} has been revoked.` });
  } catch (err) { next(err); }
});

module.exports = router;
