const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
    path: path.join(__dirname, '.env')
});

const router = express.Router();

const { pool } = require('./db');

// ============================================
// ADMIN LOGIN — USERNAME + PASSWORD
// ============================================

router.post('/login', async (req, res) => {

    try {

        const username = String(req.body.username || '')
            .trim()
            .toLowerCase();

        const password = String(req.body.password || '');

        // ============================================
        // BASIC VALIDATION
        // ============================================

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required.'
            });
        }

        if (username.length > 100 || password.length > 200) {
            return res.status(400).json({
                success: false,
                message: 'Invalid login information.'
            });
        }

        // ============================================
        // FIND ADMINISTRATOR BY USERNAME
        // ============================================

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
            WHERE LOWER(username) = LOWER($1)
            LIMIT 1
            `,
            [username]
        );

        // ============================================
        // ADMIN NOT FOUND
        // ============================================

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password.'
            });
        }

        const admin = result.rows[0];

        // ============================================
        // CHECK ACCOUNT STATUS
        // ============================================

        if (!admin.active) {
            return res.status(403).json({
                success: false,
                message: 'This administrator account is disabled.'
            });
        }

        // ============================================
        // VERIFY PASSWORD
        // ============================================

        const passwordMatches = await bcrypt.compare(
            password,
            admin.password_hash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password.'
            });
        }

        // ============================================
        // JWT SECRET
        // ============================================

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

        // ============================================
        // CREATE JWT TOKEN
        // ============================================

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

        // ============================================
        // UPDATE LAST LOGIN
        // ============================================

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

        // ============================================
        // LOGIN SUCCESS
        // ============================================

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

module.exports = router;