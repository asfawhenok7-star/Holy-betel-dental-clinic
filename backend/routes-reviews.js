const express = require('express');

const router = express.Router();

const { pool } = require('./db');

// ============================================
// GET APPROVED REVIEWS
// ============================================

router.get('/', async (req, res) => {

    try {

        const result = await pool.query(
            `
            SELECT
                id,
                patient_name,
                rating,
                review_text,
                created_at
            FROM reviews
            WHERE approved = TRUE
            ORDER BY created_at DESC
            LIMIT 100
            `
        );

        // Calculate average rating
        const averageResult = await pool.query(
            `
            SELECT
                ROUND(AVG(rating)::numeric, 1) AS average_rating,
                COUNT(*) AS total_reviews
            FROM reviews
            WHERE approved = TRUE
            `
        );

        return res.json({
            success: true,
            reviews: result.rows,
            summary: {
                average_rating:
                    Number(averageResult.rows[0].average_rating) || 0,

                total_reviews:
                    Number(averageResult.rows[0].total_reviews) || 0
            }
        });

    } catch (error) {

        console.error(
            'Get reviews error:',
            error.message
        );

        return res.status(500).json({
            success: false,
            message: 'Unable to load reviews.'
        });
    }
});


// ============================================
// SUBMIT CUSTOMER REVIEW
// ============================================

router.post('/', async (req, res) => {

    try {

        const patientName = String(
            req.body.patient_name || ''
        ).trim();

        const reviewText = String(
            req.body.review_text || ''
        ).trim();

        const rating = Number(req.body.rating);

        // ========================================
        // VALIDATION
        // ========================================

        if (!patientName) {

            return res.status(400).json({
                success: false,
                message: 'Please enter your name.'
            });
        }

        if (patientName.length < 2) {

            return res.status(400).json({
                success: false,
                message: 'Name must contain at least 2 characters.'
            });
        }

        if (patientName.length > 120) {

            return res.status(400).json({
                success: false,
                message: 'Name is too long.'
            });
        }

        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {

            return res.status(400).json({
                success: false,
                message: 'Please select a rating from 1 to 5 stars.'
            });
        }

        if (!reviewText) {

            return res.status(400).json({
                success: false,
                message: 'Please write your review.'
            });
        }

        if (reviewText.length < 5) {

            return res.status(400).json({
                success: false,
                message: 'Review must contain at least 5 characters.'
            });
        }

        if (reviewText.length > 2000) {

            return res.status(400).json({
                success: false,
                message: 'Review is too long.'
            });
        }

        // ========================================
        // SAVE REVIEW
        // ========================================

        const result = await pool.query(
            `
            INSERT INTO reviews
                (
                    patient_name,
                    rating,
                    review_text,
                    approved
                )
            VALUES
                ($1, $2, $3, FALSE)
            RETURNING
                id,
                patient_name,
                rating,
                review_text,
                created_at
            `,
            [
                patientName,
                rating,
                reviewText
            ]
        );

        // ========================================
        // SUCCESS
        // ========================================

        return res.status(201).json({
            success: true,
            message:
                'Thank you! Your review has been submitted and is waiting for approval.',
            review: result.rows[0]
        });

    } catch (error) {

        console.error(
            'Submit review error:',
            error.message
        );

        return res.status(500).json({
            success: false,
            message: 'Unable to submit your review.'
        });
    }
});


module.exports = router;