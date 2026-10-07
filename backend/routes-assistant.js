const express = require('express');
const router = express.Router();

const { pool } = require('./db');

/*
    BrightSmile Dental AI Assistant
    --------------------------------
    Safe clinic-information assistant.

    It currently answers using real clinic data from PostgreSQL.
    No AI API key is placed in the browser.

    Later we can connect this route to a real AI model while
    keeping the API key safely on the server.
*/

// Basic text normalization
function normalize(text) {
    return String(text || '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');
}

// Get clinic information
async function getClinic() {
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
        ORDER BY id
        LIMIT 1
    `);

    return result.rows[0] || null;
}

// Get active services
async function getServices(clinicId) {
    const result = await pool.query(`
        SELECT
            id,
            name,
            description,
            duration_minutes,
            price,
            currency
        FROM services
        WHERE clinic_id = $1
          AND is_active = TRUE
        ORDER BY id
    `, [clinicId]);

    return result.rows;
}

// Get active doctors
async function getDoctors(clinicId) {
    const result = await pool.query(`
        SELECT
            id,
            full_name,
            specialty,
            bio,
            phone,
            email
        FROM doctors
        WHERE clinic_id = $1
          AND is_active = TRUE
        ORDER BY id
    `, [clinicId]);

    return result.rows;
}

// Format money safely
function formatPrice(price, currency) {
    if (price === null || price === undefined) {
        return '';
    }

    return `${Number(price).toLocaleString()} ${currency || 'ETB'}`;
}

// Main assistant
router.post('/', async (req, res) => {
    try {
        const message = normalize(req.body.message);

        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a question.'
            });
        }

        if (message.length > 1000) {
            return res.status(400).json({
                success: false,
                message: 'Please keep your question under 1000 characters.'
            });
        }

        const clinic = await getClinic();

        if (!clinic) {
            return res.status(500).json({
                success: false,
                message: 'Clinic information is currently unavailable.'
            });
        }

        const services = await getServices(clinic.id);
        const doctors = await getDoctors(clinic.id);

        let answer = '';
        let action = null;
        let data = null;

        /*
            GREETING
        */
        if (
            message.includes('hello') ||
            message.includes('hi') ||
            message.includes('hey') ||
            message.includes('good morning') ||
            message.includes('good afternoon') ||
            message.includes('good evening')
        ) {
            answer =
                `Hello! 👋 Welcome to ${clinic.name}. ` +
                `I'm your dental assistant. I can help you learn about our services, doctors, ` +
                `appointment booking, and clinic contact information.`;

            action = 'suggest';
        }

        /*
            BOOKING
        */
        else if (
            message.includes('book') ||
            message.includes('appointment') ||
            message.includes('schedule') ||
            message.includes('reserve')
        ) {
            answer =
                `Absolutely! 🦷 You can book an appointment online. ` +
                `Choose a service, select a doctor if you prefer, choose an available date and time, ` +
                `and enter your contact information.`;

            action = 'book';
        }

        /*
            SERVICES
        */
        else if (
            message.includes('service') ||
            message.includes('treatment') ||
            message.includes('what do you offer') ||
            message.includes('what do you have')
        ) {
            const serviceLines = services.map(service => {
                return `• ${service.name} — ${formatPrice(
                    service.price,
                    service.currency
                )} — ${service.duration_minutes} minutes`;
            });

            answer =
                `Here are the dental services currently available at ${clinic.name}:\n\n` +
                serviceLines.join('\n') +
                `\n\nIf you'd like, I can also help you start an appointment.`;

            action = 'services';
            data = services;
        }

        /*
            WHITENING
        */
        else if (
            message.includes('whitening') ||
            message.includes('white teeth') ||
            message.includes('teeth white')
        ) {
            const whitening = services.find(service =>
                normalize(service.name).includes('whitening')
            );

            if (whitening) {
                answer =
                    `Our ${whitening.name} service is currently listed at ` +
                    `${formatPrice(whitening.price, whitening.currency)} ` +
                    `with an estimated duration of ${whitening.duration_minutes} minutes.\n\n` +
                    `For a personalized recommendation, a dental professional should assess your teeth first.`;

                data = whitening;
            } else {
                answer =
                    `I couldn't find a currently active teeth-whitening service in our clinic information.`;
            }

            action = 'service';
        }

        /*
            IMPLANTS
        */
        else if (
            message.includes('implant') ||
            message.includes('implants')
        ) {
            const implants = services.find(service =>
                normalize(service.name).includes('implant')
            );

            if (implants) {
                answer =
                    `Our ${implants.name} service is currently listed at ` +
                    `${formatPrice(implants.price, implants.currency)} ` +
                    `with an estimated duration of ${implants.duration_minutes} minutes.\n\n` +
                    `Dental implants require an individual clinical assessment, so please discuss your situation with a dentist.`;

                data = implants;
            } else {
                answer =
                    `I couldn't find an active dental implant service in the clinic information.`;
            }

            action = 'service';
        }

        /*
            DOCTORS
        */
        else if (
            message.includes('doctor') ||
            message.includes('dentist') ||
            message.includes('dentists') ||
            message.includes('specialist') ||
            message.includes('who works')
        ) {
            const doctorLines = doctors.map(doctor => {
                return `• ${doctor.full_name} — ${doctor.specialty}`;
            });

            answer =
                `Our dental team currently includes:\n\n` +
                doctorLines.join('\n') +
                `\n\nYou can select a doctor when booking an appointment.`;

            action = 'doctors';
            data = doctors;
        }

        /*
            PRICING
        */
        else if (
            message.includes('price') ||
            message.includes('cost') ||
            message.includes('how much') ||
            message.includes('fee')
        ) {
            const priceLines = services.map(service => {
                return `• ${service.name}: ${formatPrice(
                    service.price,
                    service.currency
                )}`;
            });

            answer =
                `Here are the current listed service prices:\n\n` +
                priceLines.join('\n') +
                `\n\nPrices shown here are clinic information and may be subject to change.`;

            action = 'prices';
            data = services;
        }

        /*
            CONTACT
        */
        else if (
            message.includes('contact') ||
            message.includes('phone') ||
            message.includes('email') ||
            message.includes('address') ||
            message.includes('location') ||
            message.includes('where are you')
        ) {
            const contactParts = [];

            if (clinic.phone) {
                contactParts.push(`📞 ${clinic.phone}`);
            }

            if (clinic.email) {
                contactParts.push(`✉️ ${clinic.email}`);
            }

            if (clinic.address) {
                contactParts.push(`📍 ${clinic.address}`);
            }

            answer =
                `Here is the clinic contact information:\n\n` +
                contactParts.join('\n');

            action = 'contact';
        }

        /*
            EMERGENCY / URGENT SYMPTOMS
        */
        else if (
            message.includes('emergency') ||
            message.includes('severe bleeding') ||
            message.includes('heavy bleeding') ||
            message.includes('difficulty breathing') ||
            message.includes('swelling') ||
            message.includes('severe pain')
        ) {
            answer =
                `If you are experiencing a dental emergency, especially difficulty breathing, ` +
                `rapidly increasing swelling, uncontrolled bleeding, serious facial injury, ` +
                `or another life-threatening problem, seek emergency medical care immediately.\n\n` +
                `For urgent dental symptoms that are not life-threatening, contact the clinic as soon as possible. ` +
                `I can provide clinic information, but I cannot diagnose your condition.`;

            action = 'emergency';
        }

        /*
            GENERAL DENTAL SAFETY
        */
        else if (
            message.includes('toothache') ||
            message.includes('tooth pain') ||
            message.includes('cavity') ||
            message.includes('bleeding gums') ||
            message.includes('gum pain')
        ) {
            answer =
                `Dental pain or gum symptoms can have several possible causes, and an examination is needed to determine the cause. ` +
                `Avoid relying on an online assistant for diagnosis.\n\n` +
                `If symptoms are severe, worsening, or accompanied by significant swelling, fever, trauma, ` +
                `difficulty swallowing, or difficulty breathing, seek professional care promptly.\n\n` +
                `Would you like to book a dental appointment?`;

            action = 'book';
        }

        /*
            HELP
        */
        else if (
            message.includes('help') ||
            message.includes('what can you do') ||
            message.includes('how can you help')
        ) {
            answer =
                `I can help you with:\n\n` +
                `• 🦷 Dental services\n` +
                `• 👨‍⚕️ Our doctors\n` +
                `• 📅 Booking an appointment\n` +
                `• 💰 Current service prices\n` +
                `• 📞 Clinic contact information\n` +
                `• 🚨 General dental emergency guidance\n\n` +
                `What would you like to know?`;

            action = 'help';
        }

        /*
            UNKNOWN QUESTION
        */
        else {
            answer =
                `I'm the BrightSmile Dental Assistant. I can help with clinic services, ` +
                `doctors, prices, appointments, and contact information.\n\n` +
                `Try asking:\n` +
                `• "What services do you offer?"\n` +
                `• "How much is teeth whitening?"\n` +
                `• "Who are your dentists?"\n` +
                `• "I want to book an appointment"\n` +
                `• "How can I contact the clinic?"`;

            action = 'help';
        }

        res.json({
            success: true,
            assistant: 'BrightSmile Dental Assistant',
            answer,
            action,
            data
        });

    } catch (error) {
        console.error('Assistant error:', error.message);

        res.status(500).json({
            success: false,
            message: 'The dental assistant is temporarily unavailable.'
        });
    }
});

module.exports = router;