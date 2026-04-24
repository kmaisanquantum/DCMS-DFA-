const router = require('express').Router();
const { body, param, validationResult } = require('express-validator');
const db = require('../db/pool');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// POST /api/admin/config-change — Propose category update
router.post('/config-change', [
  body('category_id').isUUID(),
  body('proposed_data').isObject(),
  body('requested_by').trim().notEmpty(),
], validate, async (req, res, next) => {
  try {
    const { category_id, proposed_data, requested_by } = req.body;
    const { rows: [change] } = await db.query(`
      INSERT INTO pending_config_changes (category_id, proposed_data, requested_by)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [category_id, proposed_data, requested_by]);
    res.status(201).json(change);
  } catch (err) { next(err); }
});

// PUT /api/admin/config-change/:id/sign — Sign/Approve change
router.put('/config-change/:id/sign', [
  param('id').isUUID(),
  body('dept_code').isIn(['DFA', 'DOT', 'RPNGC', 'PNGDF', 'NICTA', 'DICT']),
], validate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { dept_code } = req.body;

    const result = await db.transaction(async (client) => {
      const { rows: [change] } = await client.query(
        'SELECT * FROM pending_config_changes WHERE change_id = $1 FOR UPDATE', [id]
      );
      if (!change) throw new Error('Change request not found');

      const signatures = new Set(change.approved_by);
      signatures.add(dept_code);
      const updatedSignatures = Array.from(signatures);

      if (updatedSignatures.length >= 6) {
        // Apply change
        const { rows: [oldCat] } = await client.query(
          'SELECT * FROM clearance_categories WHERE category_id = $1', [change.category_id]
        );

        await client.query(`
          UPDATE clearance_categories
          SET display_name = $1, metadata_schema = $2
          WHERE category_id = $3
        `, [change.proposed_data.display_name, change.proposed_data.metadata_schema, change.category_id]);

        await client.query(`
          INSERT INTO system_config_history (change_id, entity_type, entity_id, old_data, new_data)
          VALUES ($1, 'CATEGORY', $2, $3, $4)
        `, [id, change.category_id, oldCat, change.proposed_data]);

        await client.query(
          "UPDATE pending_config_changes SET approved_by = $1, status = 'APPROVED' WHERE change_id = $2",
          [JSON.stringify(updatedSignatures), id]
        );

        return { status: 'APPLIED', signatures: updatedSignatures };
      } else {
        await client.query(
          'UPDATE pending_config_changes SET approved_by = $1 WHERE change_id = $2',
          [JSON.stringify(updatedSignatures), id]
        );
        return { status: 'PENDING', signatures: updatedSignatures };
      }
    });

    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
