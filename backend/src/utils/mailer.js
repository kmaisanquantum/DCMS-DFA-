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
        subject: `${request.escalation ? '🚨 [URGENT HOD ESCALATION] ' : '[ACTION REQUIRED] '}Diplomatic Clearance Review — ${request.reference_number}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <div style="background:${request.escalation ? '#c00' : '#1a3a6b'};color:#fff;padding:20px;border-radius:8px 8px 0 0">
              <h2 style="margin:0">🇵🇬 DCMS — Papua New Guinea DFA</h2>
              <p style="margin:4px 0 0;opacity:.8">${request.escalation ? '⚠️ EMERGENCY REVIEW REQUIRED (24H)' : 'Diplomatic Clearance Review Required'}</p>
            </div>
            <div style="border:1px solid #ddd;border-top:none;padding:24px;border-radius:0 0 8px 8px">
              <p>Dear <strong>${review.dept_name}</strong>,</p>
              <p>A diplomatic clearance application requires your department's review.</p>
              <table style="width:100%;border-collapse:collapse;margin:16px 0">
                <tr style="background:#f5f5f5"><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Reference</td><td style="padding:8px;border:1px solid #ddd">${request.reference_number}</td></tr>
                <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Mission</td><td style="padding:8px;border:1px solid #ddd">${request.mission_name} (${request.country_name})</td></tr>
                <tr style="background:#f5f5f5"><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Vessel</td><td style="padding:8px;border:1px solid #ddd">${request.vessel_name}</td></tr>
                <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Entry Date</td><td style="padding:8px;border:1px solid #ddd">${request.proposed_entry_date}</td></tr>
                <tr style="background:#f5f5f5"><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Type</td><td style="padding:8px;border:1px solid #ddd">${(request.is_emergency || request.clearance_type === 'EMERGENCY') ? '⚡ EMERGENCY (24h)' : 'Standard (10 working days)'}</td></tr>
                <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Review Deadline</td><td style="padding:8px;border:1px solid #ddd;color:${(request.is_emergency || request.clearance_type === 'EMERGENCY') ? '#c00' : '#333'}">${new Date(request.review_deadline).toLocaleString()}</td></tr>
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

async function notifyDFA_PPOC(pool, request, categoryName) {
  try {
    const { rows: [dfa] } = await pool.query(
      "SELECT dept_name, contact_email FROM departments WHERE dept_code = 'DFA'"
    );
    if (!dfa || !dfa.contact_email) return;

    await transporter.sendMail({
      from: `"DCMS Notifications" <noreply@dfa.gov.pg>`,
      to: dfa.contact_email,
      subject: `[NEW REQUEST] ${categoryName} — ${request.reference_number}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#005a9c;color:#fff;padding:20px;border-radius:8px 8px 0 0">
            <h2 style="margin:0">🇵🇬 DCMS — New Application Alert</h2>
          </div>
          <div style="border:1px solid #ddd;border-top:none;padding:24px;border-radius:0 0 8px 8px">
            <p>Dear DFA Primary Point of Contact,</p>
            <p>A new diplomatic clearance application has been submitted and tagged.</p>

            <div style="background:#f9fafb;padding:16px;border-radius:6px;margin:16px 0;border:1px solid #edf2f7">
              <div style="font-size:12px;color:#718096;text-transform:uppercase;font-weight:700">Category Tag</div>
              <div style="font-size:18px;color:#2d3748;font-weight:800;margin-top:2px">${categoryName}</div>
            </div>

            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <tr><td style="padding:8px;font-weight:bold">Reference</td><td>${request.reference_number}</td></tr>
              <tr><td style="padding:8px;font-weight:bold">Mission</td><td>${request.mission_name || 'Foreign Mission'}</td></tr>
              <tr><td style="padding:8px;font-weight:bold">Priority</td><td>${request.clearance_type === 'EMERGENCY' ? '🔴 EMERGENCY' : 'Standard'}</td></tr>
              <tr><td style="padding:8px;font-weight:bold">SLA Start</td><td>${new Date().toLocaleString()}</td></tr>
            </table>

            <p style="color:#4a5568;font-size:14px;line-height:1.5">
              The SLA clock for this request has started.
              ${request.clearance_type === 'EMERGENCY'
                ? '<strong>Note:</strong> This is an emergency request requiring action within <strong>24 hours</strong>.'
                : 'Initial DFA review is required within <strong>2 working days</strong>.'}
            </p>

            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/requests/${request.request_id}"
               style="display:inline-block;background:#005a9c;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:16px">
              View Application Details →
            </a>
          </div>
        </div>`,
    });
    logger.info(`DFA PPOC notified for request ${request.reference_number} [${categoryName}]`);
  } catch (err) {
    logger.error(`Failed to notify DFA PPOC: ${err.message}`);
  }
}

async function sendAgencyReminder(pool, review, request) {
  try {
    await transporter.sendMail({
      from: `"DCMS Notifications" <noreply@dfa.gov.pg>`,
      to: review.contact_email,
      subject: `⚠️ [SLA REMINDER] Clearance Review Pending — ${request.reference_number}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#eab308;color:#000;padding:20px;border-radius:8px 8px 0 0">
            <h2 style="margin:0">🇵🇬 DCMS — SLA Reminder</h2>
            <p style="margin:4px 0 0;opacity:.8">Action required within 48 hours</p>
          </div>
          <div style="border:1px solid #ddd;border-top:none;padding:24px;border-radius:0 0 8px 8px">
            <p>Dear <strong>${review.dept_name}</strong>,</p>
            <p>This is a reminder that the diplomatic clearance application <strong>${request.reference_number}</strong> is still pending your review.</p>
            <p>According to the SOP, a decision is required within 5 working days. The deadline is approaching.</p>

            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/review/${review.review_id}"
               style="display:inline-block;background:#1a3a6b;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:16px">
              Review Now →
            </a>
          </div>
        </div>`,
    });
    await pool.query(
      'UPDATE workflow_steps SET reminder_sent_at = NOW() WHERE review_id = $1',
      [review.review_id]
    );
    logger.info(`Reminder sent to ${review.dept_code} for request ${request.reference_number}`);
  } catch (err) {
    logger.error(`Failed to send reminder to ${review.dept_code}: ${err.message}`);
  }
}

async function sendDenialNotice(pool, request, rejectionDetails) {
  try {
    const { rows: [mission] } = await pool.query(
      "SELECT contact_email FROM missions WHERE mission_id = $1",
      [request.mission_id]
    );
    if (!mission || !mission.contact_email) return;

    await transporter.sendMail({
      from: `"DCMS Notifications" <noreply@dfa.gov.pg>`,
      to: mission.contact_email,
      subject: `❌ [DENIAL OF CLEARANCE] Request ${request.reference_number}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#dc2626;color:#fff;padding:20px;border-radius:8px 8px 0 0">
            <h2 style="margin:0">🇵🇬 DCMS — Denial of Clearance</h2>
          </div>
          <div style="border:1px solid #ddd;border-top:none;padding:24px;border-radius:0 0 8px 8px">
            <p>Formal Notice to the <strong>${request.mission_name || 'Foreign Mission'}</strong>,</p>
            <p>Your request for diplomatic clearance (Ref: ${request.reference_number}) has been <strong>REJECTED</strong>.</p>

            <div style="background:#fee2e2;padding:16px;border-radius:6px;margin:16px 0;border:1px solid #fecaca;color:#991b1b">
              <h4 style="margin:0 0 8px 0">Reason for Non-Compliance:</h4>
              <p style="margin:0;font-size:14px">${rejectionDetails.comments || 'Non-compliance with national standards.'}</p>
              <p style="margin-top:8px;font-size:12px;font-style:italic">Cited SOP Procedure: Section 7.1 (Compliance and Penalties)</p>
            </div>

            <p style="font-size:13px;color:#4b5563">
              If you wish to appeal this decision, please contact the DFA Primary Point of Contact within 48 hours.
            </p>
          </div>
        </div>`,
    });
    logger.info(`Denial notice sent for request ${request.reference_number}`);
  } catch (err) {
    logger.error(`Failed to send denial notice: ${err.message}`);
  }
}

module.exports = { notifyDepartments, notifyDFA_PPOC, sendAgencyReminder, sendDenialNotice };
