const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
    path: path.join(__dirname, '.env'),
    override: true
});

const router = express.Router();

const { pool } = require('./db');

// ============================================================
// ADMIN LOGIN
// Accepts USERNAME or EMAIL + PASSWORD
// ============================================================

router.post('/login', async (req, res) => {

    try {

        const login = String(
            req.body.username ||
            req.body.email ||
            ''
        ).trim().toLowerCase();

        const password = String(
            req.body.password || ''
        );

        // ====================================================
        // BASIC VALIDATION
        // ====================================================

        if (!login || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username/email and password are required.'
            });
        }

        if (login.length > 150 || password.length > 200) {
            return res.status(400).json({
                success: false,
                message: 'Invalid login information.'
            });
        }

        // ====================================================
        // FIND ADMIN BY USERNAME OR EMAIL
        // ====================================================

        const result = await pool.query(
            `
            SELECT
                id,
                name,
                username,
                email,
                password_hash,
                role,
                active
            FROM admins
            WHERE
                LOWER(username) = LOWER($1)
                OR LOWER(email) = LOWER($1)
            LIMIT 1
            `,
            [login]
        );

        // ====================================================
        // ADMIN NOT FOUND
        // ====================================================

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username/email or password.'
            });
        }

        const admin = result.rows[0];

        // ====================================================
        // CHECK ACCOUNT STATUS
        // ====================================================

        if (!admin.active) {
            return res.status(403).json({
                success: false,
                message: 'This administrator account is disabled.'
            });
        }

        // ====================================================
        // VERIFY PASSWORD
        // ====================================================

        const passwordMatches = await bcrypt.compare(
            password,
            admin.password_hash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username/email or password.'
            });
        }

        // ====================================================
        // JWT SECRET
        // ====================================================

        const jwtSecret = process.env.JWT_SECRET;

        if (!jwtSecret) {

            console.error(
                'JWT_SECRET is missing from backend/.env'
            );

            return res.status(500).json({
                success: false,
                message: 'Authentication service is not configured.'
            });
        }

        // ====================================================
        // CREATE JWT TOKEN
        // ====================================================

        const token = jwt.sign(
            {
                id: admin.id,
                username: admin.username,
                email: admin.email,
                role: admin.role,
                name: admin.name
            },
            jwtSecret,
            {
                expiresIn: '8h',
                issuer: 'holy-betel-dental',
                subject: String(admin.id)
            }
        );

        // ====================================================
        // UPDATE LAST LOGIN
        // ====================================================

        await pool.query(
            `
            UPDATE admins
            SET
                last_login = NOW(),
                updated_at = NOW()
            WHERE id = $1
            `,
            [admin.id]
        );

        // ====================================================
        // LOGIN SUCCESS
        // ====================================================

        return res.json({
            success: true,
            message: 'Login successful.',
            token,

            admin: {
                id: admin.id,
                name: admin.name,
                username: admin.username,
                email: admin.email,
                role: admin.role
            }
        });

    } catch (error) {

        console.error(
            'Admin login error:',
            error.message
        );

        return res.status(500).json({
            success: false,
            message: 'Unable to process login.'
        });
    }
});


// ============================================================
// ADMIN AUTHENTICATION MIDDLEWARE
// ============================================================

function authenticateAdmin(req, res, next) {

    try {

        const authHeader = req.headers.authorization || '';

        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        const token = authHeader.substring(7).trim();

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Authentication token is missing.'
            });
        }

        const jwtSecret = process.env.JWT_SECRET;

        if (!jwtSecret) {
            console.error(
                'JWT_SECRET is missing from backend/.env'
            );

            return res.status(500).json({
                success: false,
                message: 'Authentication service is not configured.'
            });
        }

        const decoded = jwt.verify(
            token,
            jwtSecret,
            {
                issuer: 'holy-betel-dental'
            }
        );

        req.admin = decoded;

        next();

    } catch (error) {

        console.error(
            'Admin authentication error:',
            error.message
        );

        return res.status(401).json({
            success: false,
            message: 'Invalid or expired authentication token.'
        });
    }
}


// ============================================================
// CURRENT ADMIN
// GET /api/admin/me
// ============================================================

router.get('/me', authenticateAdmin, async (req, res) => {

    try {

        const result = await pool.query(
            `
            SELECT
                id,
                name,
                username,
                email,
                role,
                active,
                last_login
            FROM admins
            WHERE id = $1
            LIMIT 1
            `,
            [req.admin.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Administrator account not found.'
            });
        }

        const admin = result.rows[0];

        if (!admin.active) {
            return res.status(403).json({
                success: false,
                message: 'This administrator account is disabled.'
            });
        }

        return res.json({
            success: true,
            admin
        });

    } catch (error) {

        console.error(
            'Admin profile error:',
            error.message
        );

        return res.status(500).json({
            success: false,
            message: 'Unable to load administrator profile.'
        });
    }
});


// ============================================================
// EXPORT
// ============================================================

module.exports = router;
module.exports.authenticateAdmin = authenticateAdmin;