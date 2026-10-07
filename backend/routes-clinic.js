const express = require('express');
const router = express.Router();

const { pool } = require('./db');

/*
  PUBLIC CLINIC INFORMATION

  No prices are returned by this API.
*/

router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                id,
                name,
                phone,
                email,
                address,
                whatsapp,
                timezone
            FROM clinics
            WHERE is_active = TRUE
            ORDER BY id ASC
            LIMIT 1
        `);

        if (!result.rows.length) {
            return res.status(404).json({
                success: false,
                message: 'Clinic information not found.'
            });
        }

        res.json({
            success: true,
            clinic: result.rows[0]
        });

    } catch (error) {
        console.error('Clinic information error:', error.message);

        res.status(500).json({
            success: false,
            message: 'Could not load clinic information.'
        });
    }
});

module.exports = router;