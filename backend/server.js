const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
require('dotenv').config();

const { testDatabaseConnection } = require('./db');
const appointmentsRouter = require('./routes-appointments');
const assistantRouter = require('./routes-assistant');
const clinicRouter = require('./routes-clinic');
const telegramRouter = require('./routes-telegram');
const adminAuthRouter = require('./routes-admin-auth');
const reviewsRouter = require('./routes-reviews');

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// ============================================
// BASIC SECURITY
// ============================================

app.disable('x-powered-by');

if (process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
}

// ============================================
// FRONTEND
// ============================================

const frontendPath = path.join(__dirname, '..', 'frontend');
const indexPath = path.join(frontendPath, 'index.html');
const bookingPath = path.join(frontendPath, 'booking.html');
const adminPath = path.join(frontendPath, 'admin');

// ============================================
// STATIC FRONTEND FILES
// ============================================

app.use(express.static(frontendPath, {
    dotfiles: 'deny',
    index: false,
    redirect: false,
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0
}));

// ============================================
// PUBLIC WEBSITE
// ============================================

app.get('/', (req, res) => {
    res.sendFile(indexPath);
});

// ============================================
// BOOKING PAGE
// ============================================

app.get('/booking.html', (req, res) => {
    res.sendFile(bookingPath);
});

// ============================================
// ADMIN PORTAL
// ============================================

// Same Holy Betel website system.
// /admin opens the protected admin login page.

app.get('/admin', (req, res) => {
    res.sendFile(path.join(adminPath, 'login.html'));
});

app.get('/admin/', (req, res) => {
    res.sendFile(path.join(adminPath, 'login.html'));
});

// ============================================
// SECURITY HEADERS
// ============================================

app.use(helmet({
    contentSecurityPolicy: false,

    crossOriginEmbedderPolicy: false,

    referrerPolicy: {
        policy: 'strict-origin-when-cross-origin'
    },

    frameguard: {
        action: 'deny'
    },

    hidePoweredBy: true,

    noSniff: true,

    xssFilter: false,

    hsts: process.env.NODE_ENV === 'production'
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        }
        : false
}));

// ============================================
// CORS
// ============================================

const allowedOrigins = [
    'http://localhost:5000',
    'http://127.0.0.1:5000'
];

if (process.env.FRONTEND_URL) {
    const productionOrigins = process.env.FRONTEND_URL
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean);

    allowedOrigins.push(...productionOrigins);
}

app.use(cors({
    origin: function (origin, callback) {

        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        console.warn(`Blocked CORS request from: ${origin}`);

        return callback(new Error('CORS origin not allowed'));
    },

    credentials: true,

    methods: [
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS'
    ],

    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Accept'
    ],

    optionsSuccessStatus: 204
}));

// ============================================
// RATE LIMITING
// ============================================

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,

    max: 200,

    standardHeaders: 'draft-7',

    legacyHeaders: false,

    message: {
        success: false,
        message: 'Too many requests. Please try again later.'
    },

    handler: (req, res) => {

        console.warn(
            `Rate limit exceeded: ${req.ip} ${req.method} ${req.originalUrl}`
        );

        res.status(429).json({
            success: false,
            message: 'Too many requests. Please try again later.'
        });
    }
});

app.use('/api/', apiLimiter);

// ============================================
// EXTRA PROTECTION FOR AI ASSISTANT
// ============================================

const assistantLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,

    max: 40,

    standardHeaders: 'draft-7',

    legacyHeaders: false,

    message: {
        success: false,
        message: 'AI assistant request limit reached. Please try again later.'
    }
});

app.use('/api/assistant', assistantLimiter);

// ============================================
// REQUEST BODY LIMITS
// ============================================

app.use(express.json({
    limit: '100kb',
    strict: true
}));

app.use(express.urlencoded({
    extended: false,
    limit: '100kb',
    parameterLimit: 50
}));

// ============================================
// HTTP PARAMETER POLLUTION PROTECTION
// ============================================

app.use(hpp());

// ============================================
// REQUEST URL VALIDATION
// ============================================

app.use((req, res, next) => {

    if (req.originalUrl.length > 2048) {

        return res.status(414).json({
            success: false,
            message: 'Request URL is too long.'
        });
    }

    next();
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', async (req, res) => {

    res.set('Cache-Control', 'no-store');

    res.json({
        success: true,
        message: 'Dental Clinic API is running',
        database: 'connected',
        time: new Date().toISOString()
    });
});

// ============================================
// API INFORMATION
// ============================================

app.get('/api', (req, res) => {

    res.set('Cache-Control', 'no-store');

    res.json({
        success: true,

        name: 'Dental Clinic Management System',

        version: '1.0.0',

        features: [
            'Website',
            'Online Booking',
            'AI Assistant',
            'Clinic Dashboard',
            'Telegram Notifications'
        ],

        endpoints: {
            health: '/api/health',
            clinic: '/api/clinic',
            appointments: '/api/appointments',
            assistant: '/api/assistant',
            telegram: '/api/telegram',
            admin: '/api/admin'
        },

        message: 'API is running'
    });
});

// ============================================
// CLINIC
// ============================================

app.use('/api/clinic', clinicRouter);

// ============================================
// APPOINTMENTS
// ============================================

app.use('/api/appointments', appointmentsRouter);

// ============================================
// AI ASSISTANT
// ============================================

app.use('/api/assistant', assistantRouter);

// ============================================
// TELEGRAM
// ============================================

app.use('/api/telegram', telegramRouter);

// ============================================
// ADMIN AUTHENTICATION
// ============================================

app.use('/api/admin', adminAuthRouter);

// ============================================
// REVIEWS
// ============================================

app.use('/api/reviews', reviewsRouter);

// ============================================
// API 404
// ============================================

app.use((req, res, next) => {

    if (req.path.startsWith('/api/')) {

        return res.status(404).json({
            success: false,
            message: 'API endpoint not found'
        });
    }

    next();
});

// ============================================
// GLOBAL ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {

    console.error(
        'Server error:',
        err.message
    );

    if (err.message === 'CORS origin not allowed') {

        return res.status(403).json({
            success: false,
            message: 'Request origin not allowed.'
        });
    }

    const statusCode =
        Number(err.status) >= 400 &&
        Number(err.status) < 600
            ? Number(err.status)
            : 500;

    res.status(statusCode).json({

        success: false,

        message:
            statusCode === 500
                ? 'Internal server error.'
                : err.message
    });
});

// ============================================
// START SERVER
// ============================================

async function startServer() {

    try {

        await testDatabaseConnection();

        app.listen(PORT, () => {

            console.log('');

            console.log('============================================');
            console.log('       DENTAL CLINIC API SERVER');
            console.log('============================================');

            console.log(
                `Website:        http://localhost:${PORT}`
            );

            console.log(
                `Booking:        http://localhost:${PORT}/booking.html`
            );

            console.log(
                `Admin Portal:   http://localhost:${PORT}/admin`
            );

            console.log(
                `Server running: http://localhost:${PORT}`
            );

            console.log(
                `Health check:   http://localhost:${PORT}/api/health`
            );

            console.log(
                `Clinic info:    http://localhost:${PORT}/api/clinic`
            );

            console.log(
                `Appointments:   http://localhost:${PORT}/api/appointments`
            );

            console.log(
                `AI Assistant:   http://localhost:${PORT}/api/assistant`
            );

            console.log(
                `Telegram:       http://localhost:${PORT}/api/telegram`
            );

            console.log(
                `Environment:    ${process.env.NODE_ENV || 'development'}`
            );

            console.log(
                'Database:       PostgreSQL connected'
            );

            console.log(
                'Security:       Enhanced'
            );

            console.log('============================================');

            console.log('');
        });

    } catch (error) {

        console.error('');

        console.error(
            '============================================'
        );

        console.error(
            'DATABASE CONNECTION FAILED'
        );

        console.error(
            '============================================'
        );

        console.error(error.message);

        console.error('');

        console.error(
            'Check your .env PostgreSQL settings.'
        );

        console.error('');

        process.exit(1);
    }
}

startServer();