const db = require('../db/pool');
const { sendAgencyReminder } = require('../utils/mailer');
const logger = require('../utils/logger');

/**
 * Scan for pending reviews that are nearing the 5-day SLA
 * (e.g., pending for more than 3 working days and not yet reminded)
 */
async function processSLAReminders() {
  try {
    const { rows: pending } = await db.query(`
      SELECT ws.*, d.dept_name, d.dept_code, d.contact_email, r.reference_number
      FROM workflow_steps ws
      JOIN departments d ON ws.dept_id = d.dept_id
      JOIN requests r ON ws.request_id = r.request_id
      WHERE ws.status = 'PENDING'
        AND ws.reminder_sent_at IS NULL
        AND ws.created_at < NOW() - INTERVAL '3 days'
        AND r.status = 'UNDER_REVIEW'
    `);

    for (const review of pending) {
      if (review.contact_email) {
        await sendAgencyReminder(db, review, { reference_number: review.reference_number });
      }
    }
  } catch (err) {
    logger.error('SLA Reminder Job Failed:', err);
  }
}

module.exports = { processSLAReminders };
