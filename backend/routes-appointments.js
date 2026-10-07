const express = require('express');
const { pool } = require('./db');

require('dotenv').config();

const router = express.Router();


// ============================================
// TELEGRAM NOTIFICATION
// ============================================

async function sendTelegramMessage(message) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    // Telegram is optional.
    if (!token || !chatId) {
        console.log(
            'Telegram notification skipped: Telegram is not configured.'
        );

        return false;
    }

    try {
        const telegramUrl =
            `https://api.telegram.org/bot${token}/sendMessage`;

        const response = await fetch(telegramUrl, {
            method: 'POST',

            headers: {
                'Content-Type': 'application/json'
            },

            body: JSON.stringify({
                chat_id: chatId,
                text: message
            })
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
            console.error(
                'Telegram notification failed:',
                data.description || 'Unknown Telegram error'
            );

            return false;
        }

        console.log(
            'Telegram appointment notification sent.'
        );

        return true;

    } catch (error) {

        console.error(
            'Telegram notification error:',
            error.message
        );

        return false;
    }
}


// ============================================
// HELPERS
// ============================================

function cleanText(value, maxLength = 500) {

    if (
        value === undefined ||
        value === null
    ) {
        return '';
    }

    return String(value)
        .replace(/\0/g, '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim()
        .slice(0, maxLength);
}


// ============================================
// DATE VALIDATION
// ============================================

function isValidDate(value) {

    if (
        typeof value !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        return false;
    }

    const [year, month, day] =
        value.split('-').map(Number);

    const date =
        new Date(
            Date.UTC(year, month - 1, day)
        );

    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
}


// ============================================
// TIME VALIDATION
// ============================================

function isValidTime(value) {

    if (
        typeof value !== 'string' ||
        !/^\d{2}:\d{2}$/.test(value)
    ) {
        return false;
    }

    const [hour, minute] =
        value.split(':').map(Number);

    return (
        hour >= 0 &&
        hour <= 23 &&
        minute >= 0 &&
        minute <= 59
    );
}


// ============================================
// INTEGER ID VALIDATION
// ============================================

function parsePositiveInteger(value) {

    if (
        value === undefined ||
        value === null ||
        value === ''
    ) {
        return null;
    }

    const parsed =
        Number.parseInt(value, 10);

    if (
        !Number.isInteger(parsed) ||
        parsed <= 0
    ) {
        return null;
    }

    return parsed;
}


// ============================================
// EMAIL VALIDATION
// ============================================

function isValidEmail(value) {

    if (!value) {
        return true;
    }

    if (value.length > 150) {
        return false;
    }

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}


// ============================================
// PHONE VALIDATION
// ============================================

function isValidPhone(value) {

    if (!value) {
        return false;
    }

    // Allows international numbers and common
    // phone formatting characters.
    if (!/^[0-9+\-().\s]{5,50}$/.test(value)) {
        return false;
    }

    const digitsOnly =
        value.replace(/\D/g, '');

    return (
        digitsOnly.length >= 7 &&
        digitsOnly.length <= 15
    );
}


// ============================================
// DATE MUST NOT BE IN THE PAST
// ============================================

function isPastDate(dateValue) {

    const now = new Date();

    const today =
        `${now.getFullYear()}-${String(
            now.getMonth() + 1
        ).padStart(2, '0')}-${String(
            now.getDate()
        ).padStart(2, '0')}`;

    return dateValue < today;
}


// ============================================
// TIME CONVERSION
// ============================================

function timeToMinutes(time) {

    const [hour, minute] =
        time.split(':').map(Number);

    return (
        (hour * 60) +
        minute
    );
}


// ============================================
// MINIMUM / MAXIMUM APPOINTMENT TIME
// ============================================

const POSSIBLE_TIMES = [
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00'
];


// ============================================
// GET ACTIVE CLINIC
// ============================================

async function getActiveClinic(client) {

    const result = await client.query(`
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

    if (result.rows.length === 0) {
        return null;
    }

    return result.rows[0];
}


// ============================================
// GET SERVICES
// ============================================

router.get('/services', async (req, res) => {

    try {

        const client =
            await pool.connect();

        try {

            const clinic =
                await getActiveClinic(client);

            if (!clinic) {

                return res.status(404).json({
                    success: false,
                    message:
                        'No active clinic is configured.'
                });
            }

            const result =
                await client.query(`
                    SELECT
                        id,
                        name,
                        description,
                        duration_minutes
                    FROM services
                    WHERE clinic_id = $1
                      AND is_active = TRUE
                    ORDER BY name ASC
                `, [
                    clinic.id
                ]);

            return res.json({
                success: true,

                clinic: {
                    id: clinic.id,
                    name: clinic.name
                },

                services: result.rows
            });

        } finally {

            client.release();
        }

    } catch (error) {

        console.error(
            'Get services error:',
            error.message
        );

        return res.status(500).json({
            success: false,
            message:
                'Unable to load dental services.'
        });
    }
});


// ============================================
// GET DOCTORS
// ============================================

router.get('/doctors', async (req, res) => {

    try {

        const client =
            await pool.connect();

        try {

            const clinic =
                await getActiveClinic(client);

            if (!clinic) {

                return res.status(404).json({
                    success: false,
                    message:
                        'No active clinic is configured.'
                });
            }

            const result =
                await client.query(`
                    SELECT
                        id,
                        full_name,
                        specialty,
                        bio,
                        phone,
                        email,
                        photo_url
                    FROM doctors
                    WHERE clinic_id = $1
                      AND is_active = TRUE
                    ORDER BY full_name ASC
                `, [
                    clinic.id
                ]);

            return res.json({
                success: true,
                doctors: result.rows
            });

        } finally {

            client.release();
        }

    } catch (error) {

        console.error(
            'Get doctors error:',
            error.message
        );

        return res.status(500).json({
            success: false,
            message:
                'Unable to load doctors.'
        });
    }
});


// ============================================
// GET AVAILABLE TIMES
// ============================================

router.get('/availability', async (req, res) => {

    const date =
        cleanText(req.query.date, 10);

    const doctorIdValue =
        cleanText(req.query.doctorId, 20);

    // ----------------------------------------
    // DATE VALIDATION
    // ----------------------------------------

    if (!isValidDate(date)) {

        return res.status(400).json({
            success: false,
            message:
                'A valid appointment date is required.'
        });
    }

    if (isPastDate(date)) {

        return res.status(400).json({
            success: false,
            message:
                'Appointment date cannot be in the past.'
        });
    }


    // ----------------------------------------
    // DOCTOR VALIDATION
    // ----------------------------------------

    let parsedDoctorId = null;

    if (doctorIdValue) {

        parsedDoctorId =
            parsePositiveInteger(doctorIdValue);

        if (!parsedDoctorId) {

            return res.status(400).json({
                success: false,
                message:
                    'Invalid doctor ID.'
            });
        }
    }


    try {

        const client =
            await pool.connect();

        try {

            const clinic =
                await getActiveClinic(client);

            if (!clinic) {

                return res.status(404).json({
                    success: false,
                    message:
                        'No active clinic is configured.'
                });
            }


            // --------------------------------
            // VERIFY DOCTOR BELONGS TO CLINIC
            // --------------------------------

            if (parsedDoctorId) {

                const doctorResult =
                    await client.query(`
                        SELECT id
                        FROM doctors
                        WHERE id = $1
                          AND clinic_id = $2
                          AND is_active = TRUE
                        LIMIT 1
                    `, [
                        parsedDoctorId,
                        clinic.id
                    ]);

                if (
                    doctorResult.rows.length === 0
                ) {

                    return res.status(400).json({
                        success: false,
                        message:
                            'Selected doctor is not available.'
                    });
                }
            }


            // --------------------------------
            // GET BOOKED APPOINTMENTS
            // --------------------------------

            let query = `
                SELECT
                    start_time,
                    end_time
                FROM appointments
                WHERE clinic_id = $1
                  AND appointment_date = $2
                  AND status IN (
                      'pending',
                      'confirmed'
                  )
            `;

            const params = [
                clinic.id,
                date
            ];


            if (parsedDoctorId) {

                query += `
                    AND doctor_id = $3
                `;

                params.push(parsedDoctorId);
            }


            const result =
                await client.query(
                    query,
                    params
                );


            // --------------------------------
            // CHECK SLOT OCCUPANCY
            // --------------------------------

            const availableTimes =
                POSSIBLE_TIMES.map(time => {

                    const slotStart =
                        timeToMinutes(time);

                    const slotEnd =
                        slotStart + 60;

                    const overlapping =
                        result.rows.some(appointment => {

                            const bookedStart =
                                timeToMinutes(
                                    String(
                                        appointment.start_time
                                    ).slice(0, 5)
                                );

                            const bookedEnd =
                                timeToMinutes(
                                    String(
                                        appointment.end_time
                                    ).slice(0, 5)
                                );

                            return (
                                bookedStart < slotEnd &&
                                bookedEnd > slotStart
                            );
                        });

                    return {
                        time,
                        available: !overlapping
                    };
                });


            return res.json({
                success: true,
                date,

                doctorId:
                    parsedDoctorId,

                slots:
                    availableTimes
            });

        } finally {

            client.release();
        }

    } catch (error) {

        console.error(
            'Availability error:',
            error.message
        );

        return res.status(500).json({
            success: false,
            message:
                'Unable to load appointment availability.'
        });
    }
});


// ============================================
// CREATE APPOINTMENT
// ============================================

router.post('/', async (req, res) => {

    const {
        serviceId,
        doctorId,
        date,
        startTime,
        patientName,
        phone,
        email,
        reason,
        notes
    } = req.body || {};


    // ========================================
    // CLEAN INPUT
    // ========================================

    const safePatientName =
        cleanText(patientName, 150);

    const safePhone =
        cleanText(phone, 50);

    const safeEmail =
        cleanText(email, 150)
            .toLowerCase();

    const safeReason =
        cleanText(reason, 500);

    const safeNotes =
        cleanText(notes, 2000);

    const safeDate =
        cleanText(date, 10);

    const safeStartTime =
        cleanText(startTime, 5);


    // ========================================
    // REQUIRED FIELDS
    // ========================================

    if (
        !safePatientName ||
        !safePhone ||
        !serviceId ||
        !safeDate ||
        !safeStartTime
    ) {

        return res.status(400).json({
            success: false,
            message:
                'Patient name, phone, service, date and time are required.'
        });
    }


    // ========================================
    // PATIENT NAME VALIDATION
    // ========================================

    if (
        safePatientName.length < 2 ||
        safePatientName.length > 150
    ) {

        return res.status(400).json({
            success: false,
            message:
                'Please provide a valid patient name.'
        });
    }


    // ========================================
    // PHONE VALIDATION
    // ========================================

    if (!isValidPhone(safePhone)) {

        return res.status(400).json({
            success: false,
            message:
                'Please provide a valid phone number.'
        });
    }


    // ========================================
    // EMAIL VALIDATION
    // ========================================

    if (!isValidEmail(safeEmail)) {

        return res.status(400).json({
            success: false,
            message:
                'Please provide a valid email address.'
        });
    }


    // ========================================
    // DATE VALIDATION
    // ========================================

    if (!isValidDate(safeDate)) {

        return res.status(400).json({
            success: false,
            message:
                'Invalid appointment date.'
        });
    }


    if (isPastDate(safeDate)) {

        return res.status(400).json({
            success: false,
            message:
                'Appointment date cannot be in the past.'
        });
    }


    // ========================================
    // TIME VALIDATION
    // ========================================

    if (!isValidTime(safeStartTime)) {

        return res.status(400).json({
            success: false,
            message:
                'Invalid appointment time.'
        });
    }


    // ========================================
    // SERVICE ID
    // ========================================

    const parsedServiceId =
        parsePositiveInteger(serviceId);

    if (!parsedServiceId) {

        return res.status(400).json({
            success: false,
            message:
                'Invalid service.'
        });
    }


    // ========================================
    // DOCTOR ID
    // ========================================

    let parsedDoctorId = null;

    if (
        doctorId !== undefined &&
        doctorId !== null &&
        doctorId !== ''
    ) {

        parsedDoctorId =
            parsePositiveInteger(doctorId);

        if (!parsedDoctorId) {

            return res.status(400).json({
                success: false,
                message:
                    'Invalid doctor.'
            });
        }
    }


    // ========================================
    // VALIDATE CLINIC OPERATING SLOTS
    // ========================================

    if (
        !POSSIBLE_TIMES.includes(
            safeStartTime
        )
    ) {

        return res.status(400).json({
            success: false,
            message:
                'Please select a valid appointment time.'
        });
    }


    // ========================================
    // DATABASE TRANSACTION
    // ========================================

    const client =
        await pool.connect();


    try {

        await client.query('BEGIN');


        // ====================================
        // GET ACTIVE CLINIC
        // ====================================

        const clinic =
            await getActiveClinic(client);


        if (!clinic) {

            await client.query('ROLLBACK');

            return res.status(404).json({
                success: false,
                message:
                    'No active clinic is configured.'
            });
        }


        // ====================================
        // TRANSACTION LOCK
        // ====================================
        //
        // This reduces race-condition problems
        // when two people try to book the same
        // doctor/time simultaneously.
        //
        // PostgreSQL releases the lock
        // automatically when the transaction ends.
        //

        const lockPart =
            parsedDoctorId
                ? parsedDoctorId
                : 0;

        await client.query(`
            SELECT pg_advisory_xact_lock(
                $1::bigint
            )
        `, [
            (
                BigInt(clinic.id) * 1000000000n
            ) +
            (
                BigInt(lockPart) * 1000000n
            ) +
            BigInt(
                safeDate.replace(/-/g, '')
            )
        ]);


        // ====================================
        // VERIFY SERVICE
        // ====================================

        const serviceResult =
            await client.query(`
                SELECT
                    id,
                    name,
                    duration_minutes
                FROM services
                WHERE id = $1
                  AND clinic_id = $2
                  AND is_active = TRUE
                LIMIT 1
            `, [
                parsedServiceId,
                clinic.id
            ]);


        if (
            serviceResult.rows.length === 0
        ) {

            await client.query('ROLLBACK');

            return res.status(400).json({
                success: false,
                message:
                    'Selected service is not available.'
            });
        }


        const service =
            serviceResult.rows[0];


        // ====================================
        // VERIFY DOCTOR
        // ====================================

        let doctorName =
            'Any available dentist';


        if (parsedDoctorId) {

            const doctorResult =
                await client.query(`
                    SELECT
                        id,
                        full_name,
                        specialty
                    FROM doctors
                    WHERE id = $1
                      AND clinic_id = $2
                      AND is_active = TRUE
                    LIMIT 1
                `, [
                    parsedDoctorId,
                    clinic.id
                ]);


            if (
                doctorResult.rows.length === 0
            ) {

                await client.query('ROLLBACK');

                return res.status(400).json({
                    success: false,
                    message:
                        'Selected doctor is not available.'
                });
            }


            doctorName =
                doctorResult.rows[0].full_name;
        }


        // ====================================
        // CALCULATE END TIME
        // ====================================

        const duration =
            Number(service.duration_minutes) || 60;


        // Protect against broken database data.
        if (
            !Number.isInteger(duration) ||
            duration <= 0 ||
            duration > 24 * 60
        ) {

            await client.query('ROLLBACK');

            return res.status(500).json({
                success: false,
                message:
                    'Service duration is not configured correctly.'
            });
        }


        const startMinutes =
            timeToMinutes(safeStartTime);


        const endMinutes =
            startMinutes + duration;


        if (
            endMinutes > (24 * 60)
        ) {

            await client.query('ROLLBACK');

            return res.status(400).json({
                success: false,
                message:
                    'The selected appointment time is invalid for this service.'
            });
        }


        const endHour =
            Math.floor(
                endMinutes / 60
            );


        const endMinute =
            endMinutes % 60;


        const endTime =
            `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;


        // ====================================
        // DOUBLE-BOOKING PROTECTION
        // ====================================

        let conflictQuery;
        let conflictParams;


        if (parsedDoctorId) {

            conflictQuery = `
                SELECT id
                FROM appointments
                WHERE clinic_id = $1
                  AND doctor_id = $2
                  AND appointment_date = $3
                  AND status IN (
                      'pending',
                      'confirmed'
                  )
                  AND start_time < $5
                  AND end_time > $4
                LIMIT 1
            `;

            conflictParams = [
                clinic.id,
                parsedDoctorId,
                safeDate,
                safeStartTime,
                endTime
            ];

        } else {

            conflictQuery = `
                SELECT id
                FROM appointments
                WHERE clinic_id = $1
                  AND appointment_date = $2
                  AND status IN (
                      'pending',
                      'confirmed'
                  )
                  AND start_time < $4
                  AND end_time > $3
                LIMIT 1
            `;

            conflictParams = [
                clinic.id,
                safeDate,
                safeStartTime,
                endTime
            ];
        }


        const conflictResult =
            await client.query(
                conflictQuery,
                conflictParams
            );


        if (
            conflictResult.rows.length > 0
        ) {

            await client.query('ROLLBACK');

            return res.status(409).json({
                success: false,
                message:
                    'This appointment time is no longer available. Please choose another time.'
            });
        }


        // ====================================
        // FIND EXISTING PATIENT
        // ====================================

        let patientResult;


        if (safeEmail) {

            patientResult =
                await client.query(`
                    SELECT id
                    FROM patients
                    WHERE clinic_id = $1
                      AND (
                          LOWER(email) = LOWER($2)
                          OR phone = $3
                      )
                    ORDER BY id ASC
                    LIMIT 1
                `, [
                    clinic.id,
                    safeEmail,
                    safePhone
                ]);

        } else {

            patientResult =
                await client.query(`
                    SELECT id
                    FROM patients
                    WHERE clinic_id = $1
                      AND phone = $2
                    ORDER BY id ASC
                    LIMIT 1
                `, [
                    clinic.id,
                    safePhone
                ]);
        }


        // ====================================
        // CREATE / UPDATE PATIENT
        // ====================================

        let patientId;


        if (
            patientResult.rows.length > 0
        ) {

            patientId =
                patientResult.rows[0].id;


            await client.query(`
                UPDATE patients
                SET
                    full_name = $1,
                    email = NULLIF($2, ''),
                    updated_at = NOW()
                WHERE id = $3
                  AND clinic_id = $4
            `, [
                safePatientName,
                safeEmail,
                patientId,
                clinic.id
            ]);

        } else {

            const newPatient =
                await client.query(`
                    INSERT INTO patients (
                        clinic_id,
                        full_name,
                        phone,
                        email,
                        notes
                    )
                    VALUES (
                        $1,
                        $2,
                        $3,
                        NULLIF($4, ''),
                        NULLIF($5, '')
                    )
                    RETURNING id
                `, [
                    clinic.id,
                    safePatientName,
                    safePhone,
                    safeEmail,
                    safeNotes
                ]);


            patientId =
                newPatient.rows[0].id;
        }


        // ====================================
        // CREATE APPOINTMENT
        // ====================================

        const appointmentResult =
            await client.query(`
                INSERT INTO appointments (
                    clinic_id,
                    patient_id,
                    doctor_id,
                    service_id,
                    appointment_date,
                    start_time,
                    end_time,
                    status,
                    reason,
                    notes
                )
                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    'pending',
                    NULLIF($8, ''),
                    NULLIF($9, '')
                )
                RETURNING
                    id,
                    appointment_date,
                    start_time,
                    end_time,
                    status
            `, [
                clinic.id,
                patientId,
                parsedDoctorId,
                parsedServiceId,
                safeDate,
                safeStartTime,
                endTime,
                safeReason,
                safeNotes
            ]);


        const appointment =
            appointmentResult.rows[0];


        // ====================================
        // COMMIT
        // ====================================

        await client.query('COMMIT');


        // ====================================
        // TELEGRAM NOTIFICATION
        // ====================================
        //
        // Booking is already safely stored.
        // Telegram failure does NOT cancel booking.
        //

        const telegramMessage =
`🦷 NEW APPOINTMENT

🏥 ${clinic.name}

👤 Patient: ${safePatientName}
📞 Phone: ${safePhone}${safeEmail ? `\n📧 Email: ${safeEmail}` : ''}

🦷 Service: ${service.name}
👨‍⚕️ Doctor: ${doctorName}

📅 Date: ${safeDate}
⏰ Time: ${String(appointment.start_time).slice(0, 5)} - ${String(appointment.end_time).slice(0, 5)}

📌 Status: Pending
🆔 Appointment #${appointment.id}

${safeReason ? `📝 Reason: ${safeReason}\n` : ''}${safeNotes ? `💬 Notes: ${safeNotes}` : ''}`;


        await sendTelegramMessage(
            telegramMessage
        );


        // ====================================
        // SUCCESS
        // ====================================

        return res.status(201).json({

            success: true,

            message:
                'Appointment request submitted successfully.',

            appointment: {
                id: appointment.id,

                date:
                    appointment.appointment_date,

                startTime:
                    String(
                        appointment.start_time
                    ).slice(0, 5),

                endTime:
                    String(
                        appointment.end_time
                    ).slice(0, 5),

                status:
                    appointment.status
            }
        });


    } catch (error) {

        try {
            await client.query(
                'ROLLBACK'
            );
        } catch (_) {
            // Ignore rollback failure
        }


        console.error(
            'Create appointment error:',
            error.message
        );


        return res.status(500).json({
            success: false,
            message:
                'Unable to create the appointment.'
        });


    } finally {

        client.release();
    }
});


module.exports = router;