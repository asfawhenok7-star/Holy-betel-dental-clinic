const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

// Explicitly load the backend .env file
const envPath = path.join(__dirname, '.env');
dotenv.config({
    path: envPath,
    override: true
});

// Check required database settings without exposing secrets
const requiredVariables = [
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD'
];

const missingVariables = requiredVariables.filter((name) => {
    return typeof process.env[name] !== 'string' ||
           process.env[name].trim() === '';
});

if (missingVariables.length > 0) {
    console.error('Missing PostgreSQL environment variables:');
    console.error(missingVariables.join(', '));
    throw new Error(
        'PostgreSQL environment configuration is incomplete.'
    );
}

const pool = new Pool({
    host: process.env.DB_HOST.trim(),
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME.trim(),
    user: process.env.DB_USER.trim(),
    password: process.env.DB_PASSWORD,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
});

pool.on('connect', () => {
    console.log('PostgreSQL connection established');
});

pool.on('error', (err) => {
    console.error(
        'Unexpected PostgreSQL pool error:',
        err.message
    );
});

async function testDatabaseConnection() {
    const client = await pool.connect();

    try {
        const result = await client.query(
            'SELECT NOW() AS current_time'
        );

        console.log('Database connected successfully');
        console.log(
            'Database time:',
            result.rows[0].current_time
        );
    } finally {
        client.release();
    }
}

module.exports = {
    pool,
    testDatabaseConnection
};