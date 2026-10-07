const express = require('express');
const crypto = require('crypto');
require('dotenv').config();

const router = express.Router();
const { pool } = require('./db');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const TELEGRAM_API =
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// ============================================================
// SESSION STORAGE
// ============================================================

const sessions = new Map();
const LOGIN_TIMEOUT_MS = 15 * 60 * 1000;

// ============================================================
// TELEGRAM API
// ============================================================

async function telegram(method, payload = {}) {
    if (!TELEGRAM_BOT_TOKEN) {
        throw new Error('TELEGRAM_BOT_TOKEN is not configured.');
    }

    const response = await fetch(
        `${TELEGRAM_API}/${method}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        }
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
        console.error('Telegram API error:', data);
        throw new Error(
            data.description || 'Telegram API request failed.'
        );
    }

    return data;
}

// ============================================================
// PASSWORD VERIFICATION
// Format: salt:hash
// ============================================================

function verifyPassword(password, storedPassword) {
    try {
        if (!password || !storedPassword) {
            return false;
        }

        const parts = storedPassword.split(':');

        if (parts.length !== 2) {
            return false;
        }

        const salt = parts[0];
        const storedHash = parts[1];

        const calculatedHash = crypto
            .scryptSync(password, salt, 64)
            .toString('hex');

        const a = Buffer.from(calculatedHash, 'hex');
        const b = Buffer.from(storedHash, 'hex');

        if (a.length !== b.length) {
            return false;
        }

        return crypto.timingSafeEqual(a, b);

    } catch (error) {
        console.error(
            'Password verification error:',
            error.message
        );

        return false;
    }
}

// ============================================================
// SESSION HELPERS
// ============================================================

function createSession(telegramUserId) {
    const session = {
        telegramUserId,
        state: 'selecting_clinic',
        clinicId: null,
        userId: null,
        email: null,
        expiresAt: Date.now() + LOGIN_TIMEOUT_MS
    };

    sessions.set(String(telegramUserId), session);

    return session;
}

function getSession(telegramUserId) {
    const key = String(telegramUserId);
    const session = sessions.get(key);

    if (!session) {
        return null;
    }

    if (Date.now() > session.expiresAt) {
        sessions.delete(key);
        return null;
    }

    session.expiresAt =
        Date.now() + LOGIN_TIMEOUT_MS;

    return session;
}

function clearSession(telegramUserId) {
    sessions.delete(String(telegramUserId));
}

// ============================================================
// MAIN MENU
// ============================================================

function mainMenuKeyboard() {
    return {
        inline_keyboard: [
            [
                {
                    text: '📋 Pending Appointments',
                    callback_data: 'pending'
                }
            ],
            [
                {
                    text: '📅 Today',
                    callback_data: 'today'
                },
                {
                    text: '📊 Statistics',
                    callback_data: 'stats'
                }
            ],
            [
                {
                    text: '🚪 Logout',
                    callback_data: 'logout'
                }
            ]
        ]
    };
}

// ============================================================
// START / CLINIC SELECTION
// ============================================================

async function sendStart(chatId, telegramUserId) {
    const session =
        createSession(telegramUserId);

    const result = await pool.query(`
        SELECT id, name
        FROM clinics
        WHERE is_active = TRUE
        ORDER BY id ASC
    `);

    if (!result.rows.length) {
        await telegram('sendMessage', {
            chat_id: chatId,
            text: '❌ No active clinics are available.'
        });

        return;
    }

    const buttons = result.rows.map(clinic => [
        {
            text: `🦷 ${clinic.name}`,
            callback_data: `clinic:${clinic.id}`
        }
    ]);

    await telegram('sendMessage', {
        chat_id: chatId,
        text:
            '🦷 *BrightSmile Dental Management*\n\n' +
            'Welcome!\n\n' +
            'Please select your clinic:',
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: buttons
        }
    });

    session.state = 'selecting_clinic';
}

// ============================================================
// DASHBOARD
// ============================================================

async function sendDashboard(chatId, user) {
    await telegram('sendMessage', {
        chat_id: chatId,
        text:
            `🦷 *${user.clinic_name}*\n\n` +
            `👤 ${user.full_name}\n` +
            `🔐 Role: ${user.role}\n\n` +
            'Choose an action:',
        parse_mode: 'Markdown',
        reply_markup: mainMenuKeyboard()
    });
}

// ============================================================
// PENDING APPOINTMENTS
// ============================================================

async function showPendingAppointments(
    chatId,
    session
) {
    const result = await pool.query(`
        SELECT
            a.id,
            a.appointment_date,
            a.start_time,
            a.end_time,
            a.status,
            a.reason,
            p.full_name AS patient_name,
            p.phone AS patient_phone,
            d.full_name AS doctor_name,
            s.name AS service_name
        FROM appointments a
        JOIN patients p
            ON p.id = a.patient_id
        LEFT JOIN doctors d
            ON d.id = a.doctor_id
        LEFT JOIN services s
            ON s.id = a.service_id
        WHERE a.clinic_id = $1
          AND a.status = 'pending'
        ORDER BY
            a.appointment_date ASC,
            a.start_time ASC
        LIMIT 20
    `, [session.clinicId]);

    if (!result.rows.length) {
        await telegram('sendMessage', {
            chat_id: chatId,
            text:
                '📋 *Pending Appointments*\n\n' +
                '✅ No pending appointments.',
            parse_mode: 'Markdown',
            reply_markup: mainMenuKeyboard()
        });

        return;
    }

    for (const appointment of result.rows) {
        const date =
            appointment.appointment_date
                ? new Date(
                    appointment.appointment_date
                )
                    .toISOString()
                    .split('T')[0]
                : 'N/A';

        const start =
            String(appointment.start_time)
                .slice(0, 5);

        const end =
            String(appointment.end_time)
                .slice(0, 5);

        let message =
            `📋 *Appointment #${appointment.id}*\n\n` +
            `👤 Patient: ${appointment.patient_name}\n` +
            `📞 Phone: ${appointment.patient_phone}\n\n` +
            `🦷 Service: ${appointment.service_name || 'Not specified'}\n` +
            `👨‍⚕️ Doctor: ${appointment.doctor_name || 'Not assigned'}\n\n` +
            `📅 Date: ${date}\n` +
            `⏰ Time: ${start} - ${end}\n`;

        if (appointment.reason) {
            message +=
                `\n📝 Reason: ${appointment.reason}\n`;
        }

        message += '\n📌 Status: Pending';

        await telegram('sendMessage', {
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: '✅ Approve',
                            callback_data:
                                `approve:${appointment.id}`
                        },
                        {
                            text: '❌ Reject',
                            callback_data:
                                `reject:${appointment.id}`
                        }
                    ]
                ]
            }
        });
    }

    await telegram('sendMessage', {
        chat_id: chatId,
        text: 'Choose another action:',
        reply_markup: mainMenuKeyboard()
    });
}

// ============================================================
// TODAY
// ============================================================

async function showToday(chatId, session) {
    const result = await pool.query(`
        SELECT
            a.id,
            a.start_time,
            a.end_time,
            a.status,
            p.full_name AS patient_name,
            d.full_name AS doctor_name,
            s.name AS service_name
        FROM appointments a
        JOIN patients p
            ON p.id = a.patient_id
        LEFT JOIN doctors d
            ON d.id = a.doctor_id
        LEFT JOIN services s
            ON s.id = a.service_id
        WHERE a.clinic_id = $1
          AND a.appointment_date = CURRENT_DATE
        ORDER BY a.start_time ASC
    `, [session.clinicId]);

    if (!result.rows.length) {
        await telegram('sendMessage', {
            chat_id: chatId,
            text:
                '📅 *Today*\n\n' +
                'No appointments scheduled for today.',
            parse_mode: 'Markdown',
            reply_markup: mainMenuKeyboard()
        });

        return;
    }

    let message = `📅 *Today's Appointments*\n\n`;

    for (const appointment of result.rows) {
        const start =
            String(appointment.start_time)
                .slice(0, 5);

        message +=
            `🕐 ${start} — ${appointment.patient_name}\n` +
            `🦷 ${appointment.service_name || 'Service'}\n` +
            `👨‍⚕️ ${appointment.doctor_name || 'Doctor'}\n` +
            `📌 ${appointment.status}\n\n`;
    }

    await telegram('sendMessage', {
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        reply_markup: mainMenuKeyboard()
    });
}

// ============================================================
// STATISTICS
// ============================================================

async function showStatistics(chatId, session) {
    const result = await pool.query(`
        SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (
                WHERE status = 'pending'
            ) AS pending,
            COUNT(*) FILTER (
                WHERE status = 'confirmed'
            ) AS confirmed,
            COUNT(*) FILTER (
                WHERE status = 'completed'
            ) AS completed,
            COUNT(*) FILTER (
                WHERE status = 'cancelled'
            ) AS cancelled
        FROM appointments
        WHERE clinic_id = $1
          AND appointment_date = CURRENT_DATE
    `, [session.clinicId]);

    const stats = result.rows[0];

    await telegram('sendMessage', {
        chat_id: chatId,
        text:
            `📊 *Today's Statistics*\n\n` +
            `📋 Total: ${stats.total}\n` +
            `⏳ Pending: ${stats.pending}\n` +
            `✅ Confirmed: ${stats.confirmed}\n` +
            `🏁 Completed: ${stats.completed}\n` +
            `❌ Cancelled: ${stats.cancelled}`,
        parse_mode: 'Markdown',
        reply_markup: mainMenuKeyboard()
    });
}

// ============================================================
// APPROVE / REJECT
// ============================================================

async function updateAppointmentStatus(
    chatId,
    telegramUserId,
    appointmentId,
    newStatus,
    callbackQueryId
) {
    const session =
        getSession(telegramUserId);

    if (!session || !session.userId) {
        await telegram('answerCallbackQuery', {
            callback_query_id: callbackQueryId,
            text: '🔐 Please log in again.'
        });

        return;
    }

    const result = await pool.query(`
        UPDATE appointments
        SET
            status = $1,
            updated_at = NOW()
        WHERE id = $2
          AND clinic_id = $3
          AND status = 'pending'
        RETURNING id, status
    `, [
        newStatus,
        appointmentId,
        session.clinicId
    ]);

    if (!result.rows.length) {
        await telegram('answerCallbackQuery', {
            callback_query_id: callbackQueryId,
            text:
                '⚠️ Appointment unavailable or already processed.'
        });

        return;
    }

    const statusText =
        newStatus === 'confirmed'
            ? '✅ Appointment approved.'
            : '❌ Appointment rejected.';

    await telegram('answerCallbackQuery', {
        callback_query_id: callbackQueryId,
        text: statusText
    });

    await telegram('sendMessage', {
        chat_id: chatId,
        text:
            `${statusText}\n\n` +
            `🆔 Appointment #${appointmentId}`,
        reply_markup: mainMenuKeyboard()
    });
}

// ============================================================
// CALLBACK HANDLER
// ============================================================

async function handleCallbackQuery(callbackQuery) {
    const callbackId = callbackQuery.id;
    const data = callbackQuery.data || '';
    const from = callbackQuery.from;

    const chatId =
        callbackQuery.message.chat.id;

    const telegramUserId = from.id;

    try {

        // --------------------------------------------------------
        // CLINIC SELECTION
        // --------------------------------------------------------

        if (data.startsWith('clinic:')) {
            const clinicId =
                Number(data.split(':')[1]);

            if (!Number.isInteger(clinicId)) {
                await telegram(
                    'answerCallbackQuery',
                    {
                        callback_query_id: callbackId,
                        text: 'Invalid clinic.'
                    }
                );

                return;
            }

            const clinicResult = await pool.query(`
                SELECT id, name
                FROM clinics
                WHERE id = $1
                  AND is_active = TRUE
            `, [clinicId]);

            if (!clinicResult.rows.length) {
                await telegram(
                    'answerCallbackQuery',
                    {
                        callback_query_id: callbackId,
                        text: 'Clinic not available.'
                    }
                );

                return;
            }

            const session =
                getSession(telegramUserId) ||
                createSession(telegramUserId);

            session.clinicId = clinicId;
            session.state = 'waiting_email';

            await telegram(
                'answerCallbackQuery',
                {
                    callback_query_id: callbackId,
                    text:
                        `Selected ${clinicResult.rows[0].name}`
                }
            );

            await telegram('sendMessage', {
                chat_id: chatId,
                text:
                    `🏥 *${clinicResult.rows[0].name}*\n\n` +
                    'Please enter your staff email:',
                parse_mode: 'Markdown'
            });

            return;
        }

        // --------------------------------------------------------
        // AUTHENTICATED ACTIONS
        // --------------------------------------------------------

        const session =
            getSession(telegramUserId);

        if (!session || !session.userId) {
            await telegram(
                'answerCallbackQuery',
                {
                    callback_query_id: callbackId,
                    text:
                        '🔐 Please use /start to log in.'
                }
            );

            return;
        }

        if (data === 'pending') {
            await telegram(
                'answerCallbackQuery',
                {
                    callback_query_id: callbackId,
                    text:
                        'Loading pending appointments...'
                }
            );

            await showPendingAppointments(
                chatId,
                session
            );

            return;
        }

        if (data === 'today') {
            await telegram(
                'answerCallbackQuery',
                {
                    callback_query_id: callbackId,
                    text: 'Loading today...'
                }
            );

            await showToday(
                chatId,
                session
            );

            return;
        }

        if (data === 'stats') {
            await telegram(
                'answerCallbackQuery',
                {
                    callback_query_id: callbackId,
                    text: 'Loading statistics...'
                }
            );

            await showStatistics(
                chatId,
                session
            );

            return;
        }

        if (data === 'logout') {
            clearSession(telegramUserId);

            await telegram(
                'answerCallbackQuery',
                {
                    callback_query_id: callbackId,
                    text: 'Logged out.'
                }
            );

            await sendStart(
                chatId,
                telegramUserId
            );

            return;
        }

        // --------------------------------------------------------
        // APPROVE
        // --------------------------------------------------------

        if (data.startsWith('approve:')) {
            const appointmentId =
                Number(data.split(':')[1]);

            await updateAppointmentStatus(
                chatId,
                telegramUserId,
                appointmentId,
                'confirmed',
                callbackId
            );

            return;
        }

        // --------------------------------------------------------
        // REJECT
        // --------------------------------------------------------

        if (data.startsWith('reject:')) {
            const appointmentId =
                Number(data.split(':')[1]);

            await updateAppointmentStatus(
                chatId,
                telegramUserId,
                appointmentId,
                'cancelled',
                callbackId
            );

            return;
        }

        await telegram(
            'answerCallbackQuery',
            {
                callback_query_id: callbackId,
                text: 'Unknown action.'
            }
        );

    } catch (error) {
        console.error(
            'Telegram callback error:',
            error.message
        );

        try {
            await telegram(
                'answerCallbackQuery',
                {
                    callback_query_id: callbackId,
                    text:
                        '❌ Something went wrong.'
                }
            );
        } catch (_) {
            // Ignore secondary Telegram error.
        }
    }
}

// ============================================================
// MESSAGE HANDLER
// ============================================================

async function handleMessage(message) {
    if (
        !message ||
        !message.from ||
        !message.chat
    ) {
        return;
    }

    const telegramUserId =
        message.from.id;

    const chatId =
        message.chat.id;

    const text =
        String(message.text || '').trim();

    if (!text) {
        return;
    }

    try {

        // --------------------------------------------------------
        // START / LOGIN
        // --------------------------------------------------------

        if (
            text === '/start' ||
            text === '/login'
        ) {
            clearSession(telegramUserId);

            await sendStart(
                chatId,
                telegramUserId
            );

            return;
        }

        // --------------------------------------------------------
        // LOGOUT
        // --------------------------------------------------------

        if (text === '/logout') {
            clearSession(telegramUserId);

            await telegram(
                'sendMessage',
                {
                    chat_id: chatId,
                    text:
                        '🚪 You have been logged out.'
                }
            );

            await sendStart(
                chatId,
                telegramUserId
            );

            return;
        }

        const session =
            getSession(telegramUserId);

        if (!session) {
            await telegram(
                'sendMessage',
                {
                    chat_id: chatId,
                    text:
                        '🔐 Your session has expired.\n\n' +
                        'Use /start to log in again.'
                }
            );

            return;
        }

        // --------------------------------------------------------
        // STAFF EMAIL
        // --------------------------------------------------------

        if (
            session.state === 'waiting_email'
        ) {
            const email =
                text.toLowerCase();

            const result = await pool.query(`
                SELECT
                    u.id,
                    u.clinic_id,
                    u.full_name,
                    u.email,
                    u.password_hash,
                    u.role,
                    u.is_active,
                    c.name AS clinic_name
                FROM users u
                JOIN clinics c
                    ON c.id = u.clinic_id
                WHERE u.clinic_id = $1
                  AND LOWER(u.email) = LOWER($2)
                  AND u.is_active = TRUE
                  AND c.is_active = TRUE
            `, [
                session.clinicId,
                email
            ]);

            if (!result.rows.length) {
                await telegram(
                    'sendMessage',
                    {
                        chat_id: chatId,
                        text:
                            '❌ Staff account not found for this clinic.\n\n' +
                            'Please enter the correct staff email.'
                    }
                );

                return;
            }

            session.email = email;
            session.state =
                'waiting_password';

            await telegram(
                'sendMessage',
                {
                    chat_id: chatId,
                    text:
                        '🔐 Please enter your staff password.\n\n' +
                        'Your password is used only for authentication.'
                }
            );

            return;
        }

        // --------------------------------------------------------
        // STAFF PASSWORD
        // --------------------------------------------------------

        if (
            session.state === 'waiting_password'
        ) {
            const result = await pool.query(`
                SELECT
                    u.id,
                    u.clinic_id,
                    u.full_name,
                    u.email,
                    u.password_hash,
                    u.role,
                    u.is_active,
                    c.name AS clinic_name
                FROM users u
                JOIN clinics c
                    ON c.id = u.clinic_id
                WHERE u.clinic_id = $1
                  AND LOWER(u.email) = LOWER($2)
                  AND u.is_active = TRUE
                  AND c.is_active = TRUE
            `, [
                session.clinicId,
                session.email
            ]);

            if (!result.rows.length) {
                clearSession(telegramUserId);

                await telegram(
                    'sendMessage',
                    {
                        chat_id: chatId,
                        text:
                            '❌ Account no longer available.\n\n' +
                            'Please use /start again.'
                    }
                );

                return;
            }

            const user =
                result.rows[0];

            const valid =
                verifyPassword(
                    text,
                    user.password_hash
                );

            if (!valid) {
                await telegram(
                    'sendMessage',
                    {
                        chat_id: chatId,
                        text:
                            '❌ Incorrect password.\n\n' +
                            'Please try again.'
                    }
                );

                return;
            }

            await pool.query(`
                UPDATE users
                SET
                    telegram_user_id = $1,
                    telegram_username = $2,
                    telegram_linked_at = NOW(),
                    updated_at = NOW()
                WHERE id = $3
                  AND clinic_id = $4
            `, [
                telegramUserId,
                message.from.username || null,
                user.id,
                user.clinic_id
            ]);

            session.userId =
                user.id;

            session.clinicId =
                user.clinic_id;

            session.email =
                user.email;

            session.state =
                'authenticated';

            await telegram(
                'sendMessage',
                {
                    chat_id: chatId,
                    text:
                        '✅ *Login successful!*\n\n' +
                        `Welcome, ${user.full_name}.\n\n` +
                        `🦷 ${user.clinic_name}\n` +
                        `🔐 ${user.role}`,
                    parse_mode: 'Markdown',
                    reply_markup:
                        mainMenuKeyboard()
                }
            );

            return;
        }

        // --------------------------------------------------------
        // AUTHENTICATED TEXT
        // --------------------------------------------------------

        if (
            session.state === 'authenticated'
        ) {
            await telegram(
                'sendMessage',
                {
                    chat_id: chatId,
                    text:
                        'Please use the buttons below.',
                    reply_markup:
                        mainMenuKeyboard()
                }
            );
        }

    } catch (error) {
        console.error(
            'Telegram message error:',
            error.message
        );

        await telegram(
            'sendMessage',
            {
                chat_id: chatId,
                text:
                    '❌ Something went wrong.\n\n' +
                    'Please try /start again.'
            }
        );
    }
}

// ============================================================
// TELEGRAM POLLING
// ============================================================

let pollingStarted = false;

async function startTelegramPolling() {
    if (pollingStarted) {
        return;
    }

    if (!TELEGRAM_BOT_TOKEN) {
        console.log(
            'Telegram bot polling disabled: token not configured.'
        );

        return;
    }

    pollingStarted = true;

    try {
        await telegram(
            'deleteWebhook',
            {
                drop_pending_updates: false
            }
        );

        console.log(
            '============================================'
        );

        console.log(
            '       TELEGRAM MANAGEMENT BOT'
        );

        console.log(
            '============================================'
        );

        console.log(
            'Bot polling started.'
        );

        console.log(
            '============================================'
        );

        let offset = 0;

        while (true) {
            try {
                const data =
                    await telegram(
                        'getUpdates',
                        {
                            offset,
                            timeout: 30,
                            allowed_updates: [
                                'message',
                                'callback_query'
                            ]
                        }
                    );

                for (
                    const update of data.result
                ) {
                    offset =
                        update.update_id + 1;

                    if (
                        update.callback_query
                    ) {
                        await handleCallbackQuery(
                            update.callback_query
                        );
                    }

                    if (
                        update.message
                    ) {
                        await handleMessage(
                            update.message
                        );
                    }
                }

            } catch (error) {
                console.error(
                    'Telegram polling error:',
                    error.message
                );

                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            5000
                        )
                );
            }
        }

    } catch (error) {
        console.error(
            'Could not start Telegram polling:',
            error.message
        );

        pollingStarted = false;
    }
}

// ============================================================
// HTTP TEST ENDPOINT
// ============================================================

router.get('/test', async (req, res) => {
    try {
        if (!TELEGRAM_BOT_TOKEN) {
            return res.status(500).json({
                success: false,
                message:
                    'TELEGRAM_BOT_TOKEN is not configured.'
            });
        }

        if (!TELEGRAM_CHAT_ID) {
            return res.status(500).json({
                success: false,
                message:
                    'TELEGRAM_CHAT_ID is not configured yet.'
            });
        }

        const response =
            await telegram(
                'sendMessage',
                {
                    chat_id:
                        TELEGRAM_CHAT_ID,

                    text:
                        '🦷 BrightSmile Dental Clinic\n\n' +
                        '✅ Telegram connection successful!\n\n' +
                        'Your dental clinic backend is now connected to Telegram.'
                }
            );

        if (!response.ok) {
            return res.status(502).json({
                success: false,
                message:
                    'Telegram rejected the request.'
            });
        }

        res.json({
            success: true,
            message:
                'Telegram test message sent successfully.'
        });

    } catch (error) {
        console.error(
            'Telegram connection error:',
            error.message
        );

        res.status(500).json({
            success: false,
            message:
                'Could not connect to Telegram.'
        });
    }
});

// ============================================================
// START POLLING
// ============================================================

startTelegramPolling();

module.exports = router;
