const jwt = require('jsonwebtoken');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
    path: path.join(__dirname, '..', '.env')
});

// ============================================
// ADMIN AUTHENTICATION MIDDLEWARE
// ============================================

function requireAdmin(req, res, next) {

    try {

        const authorization = req.headers.authorization || '';

        if (!authorization.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        const token = authorization.substring(7).trim();

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        const jwtSecret = process.env.JWT_SECRET;

        if (!jwtSecret) {
            console.error('JWT_SECRET is missing.');

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

        if (!decoded.id || decoded.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Administrator access required.'
            });
        }

        req.admin = decoded;

        next();

    } catch (error) {

        if (
            error.name === 'TokenExpiredError' ||
            error.name === 'JsonWebTokenError'
        ) {
            return res.status(401).json({
                success: false,
                message: 'Your admin session has expired. Please log in again.'
            });
        }

        console.error('Admin authentication error:', error.message);

        return res.status(401).json({
            success: false,
            message: 'Invalid authentication.'
        });
    }
}

module.exports = requireAdmin;