const nodemailer = require('nodemailer');
const logger = require('./logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
});

async function notifyDepartments(pool, reviews, request) {
  for (const review of reviews) {
    if (!review.contact_email) continue;
    try {
      await transporter.sendMail({
        from: `"DCMS Notifications" <noreply@dfa.gov.pg>`,
        to: review.contact_email,
        subject: `[ACTION REQUIRED] Diplomatic Clearance Review — ${request.reference_number}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <div style="background:#1a3a6b;color:#fff;padding:20px;border-radius:8px 8px 0 0">
              <h2 style="margin:0">🇵🇬 DCMS — Papua New Guinea DFA</h2>
              <p style="margin:4px 0 0;opacity:.8">Diplomatic Clearance Review Required</p>
            </div>
            <div style="border:1px solid #ddd;border-top:none;padding:24px;border-radius:0 0 8px 8px">
              <p>Dear <strong>${review.dept_name}</strong>,</p>
              <p>A diplomatic clearance application requires your department's review.</p>
              <table style="width:100%;border-collapse:collapse;margin:16px 0">
                <tr style="background:#f5f5f5"><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Reference</td><td style="padding:8px;border:1px solid #ddd">${request.reference_number}</td></tr>
                <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Mission</td><td style="padding:8px;border:1px solid #ddd">${request.mission_name} (${request.country_name})</td></tr>
                <tr style="background:#f5f5f5"><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Vessel</td><td style="padding:8px;border:1px solid #ddd">${request.vessel_name}</td></tr>
                <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Entry Date</td><td style="padding:8px;border:1px solid #ddd">${request.proposed_entry_date}</td></tr>
                <tr style="background:#f5f5f5"><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Type</td><td style="padding:8px;border:1px solid #ddd">${request.clearance_type === 'EMERGENCY' ? '⚡ EMERGENCY (24h)' : 'Standard (10 working days)'}</td></tr>
                <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Review Deadline</td><td style="padding:8px;border:1px solid #ddd;color:${request.clearance_type === 'EMERGENCY' ? '#c00' : '#333'}">${new Date(request.review_deadline).toLocaleString()}</td></tr>
              </table>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/review/${review.review_id}"
                 style="display:inline-block;background:#1a3a6b;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
                Review This Application →
              </a>
              <hr style="margin:24px 0;border:none;border-top:1px solid #eee">
              <p style="font-size:12px;color:#888">This is an automated notification from the DCMS. All actions are logged.</p>
            </div>
          </div>`,
      });
      await pool.query(
        'UPDATE workflow_steps SET notified_at = NOW() WHERE review_id = $1',
        [review.review_id]
      );
      logger.info(`Notified ${review.dept_code} for request ${request.reference_number}`);
    } catch (err) {
      logger.error(`Failed to notify ${review.dept_code}: ${err.message}`);
    }
  }
}

module.exports = { notifyDepartments };
