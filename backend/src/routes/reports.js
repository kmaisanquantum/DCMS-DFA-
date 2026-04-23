const router = require('express').Router();
const db = require('../db/pool');

// GET /api/reports/stats — get dashboard and SLA metrics
router.get('/stats', async (req, res, next) => {
  try {
    const stats = {};

    // 1. Average Processing Time (from SUBMITTED to FINALIZED)
    const { rows: [avgTime] } = await db.query(`
      SELECT AVG(EXTRACT(EPOCH FROM (cl.issued_at - r.submitted_at))) / 86400 AS avg_days
      FROM requests r
      JOIN clearance_log cl ON r.request_id = cl.request_id
      WHERE r.status = 'FINALIZED' AND r.submitted_at IS NOT NULL
    `);
    stats.avg_processing_days = parseFloat(avgTime.avg_days || 0).toFixed(2);

    // 2. Pending Requests by Status
    const { rows: pendingByStatus } = await db.query(`
      SELECT status, COUNT(*) as count
      FROM requests
      WHERE status IN ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED')
      GROUP BY status
    `);
    stats.pending_by_status = pendingByStatus;

    // 3. Agency SLA Alerts (Approaching 5-day deadline)
    // We assume agency review starts when status changes to UNDER_REVIEW
    // In our simplified model, we'll check workflow_steps that are PENDING
    // and where the request's agency_review_deadline is near.
    const { rows: slaAlerts } = await db.query(`
      SELECT r.reference_number, d.dept_code, r.agency_review_deadline
      FROM workflow_steps ws
      JOIN requests r ON ws.request_id = r.request_id
      JOIN departments d ON ws.dept_id = d.dept_id
      WHERE ws.status = 'PENDING'
        AND r.status = 'UNDER_REVIEW'
        AND r.agency_review_deadline < NOW() + INTERVAL '2 days'
    `);
    stats.sla_alerts = slaAlerts;

    res.json(stats);
  } catch (err) { next(err); }
});

module.exports = router;
