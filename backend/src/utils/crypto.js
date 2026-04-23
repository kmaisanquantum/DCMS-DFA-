const crypto = require('crypto');

/**
 * Generate a SHA-512 digital hash for a clearance QR code.
 * The hash is keyed with a server-side secret so it cannot be forged.
 */
function generateDigitalHash(clearanceNumber, requestId, issuedAt) {
  const secret = process.env.QR_HASH_SECRET || 'dcms-png-dfa-fallback-secret';
  const payload = `${clearanceNumber}|${requestId}|${issuedAt}|${secret}`;
  return crypto.createHash('sha512').update(payload).digest('hex');
}

/**
 * Build the compact JSON payload that will be encoded in the QR image.
 * Kept small so QR density stays scannable.
 */
function buildQRPayload(clearanceNumber, digitalHash, validFrom, validUntil, letterHash) {
  return JSON.stringify({
    sys: 'DCMS-PNG',
    cn: clearanceNumber,
    h: digitalHash,
    lh: letterHash || null,
    vf: validFrom,
    vu: validUntil,
    url: `${process.env.PUBLIC_BASE_URL || 'https://dcms.dfa.gov.pg'}/verify/${digitalHash}`,
  });
}

/**
 * Generate a sequential reference number like DCMS-2025-000042.
 * Must be called inside an active DB client (for consistent COUNT).
 */
async function generateReferenceNumber(client) {
  const year = new Date().getFullYear();
  const { rows } = await client.query(
    `SELECT COUNT(*) AS cnt FROM requests WHERE EXTRACT(YEAR FROM created_at) = $1`,
    [year]
  );
  const seq = String(parseInt(rows[0].cnt) + 1).padStart(6, '0');
  return `DCMS-${year}-${seq}`;
}

/**
 * Generate a clearance number like CLR-PNG-2025-000042.
 */
async function generateClearanceNumber(client) {
  const year = new Date().getFullYear();
  const { rows } = await client.query(
    `SELECT COUNT(*) AS cnt FROM clearance_log WHERE EXTRACT(YEAR FROM issued_at) = $1`,
    [year]
  );
  const seq = String(parseInt(rows[0].cnt) + 1).padStart(6, '0');
  return `CLR-PNG-${year}-${seq}`;
}

module.exports = {
  generateDigitalHash,
  buildQRPayload,
  generateReferenceNumber,
  generateClearanceNumber,
};
