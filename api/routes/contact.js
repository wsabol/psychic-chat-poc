/**
 * Contact Form Route
 * Handles contact form submissions from marketing website
 */

import express from 'express';
import { sendEmail } from '../shared/email/emailSender.js';
import { generateContactFormEmail, generateContactFormAutoReply } from '../shared/email/templates/contactFormEmail.js';
import { logErrorFromCatch } from '../shared/errorLogger.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting: 3 submissions per 15 minutes per IP
const contactFormLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // limit each IP to 3 requests per windowMs
    message: {
        success: false,
        error: 'Too many contact form submissions. Please try again later.',
        errorCode: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * POST /api/contact
 * Submit contact form
 */
router.post('/', contactFormLimiter, async (req, res) => {
    try {
        const { name, email, message } = req.body;

        // Validation
        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: name, email, and message are required.',
                errorCode: 'MISSING_FIELDS'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email address format.',
                errorCode: 'INVALID_EMAIL'
            });
        }

        // Validate lengths
        if (name.length > 100) {
            return res.status(400).json({
                success: false,
                error: 'Name is too long (max 100 characters).',
                errorCode: 'NAME_TOO_LONG'
            });
        }

        if (message.length > 5000) {
            return res.status(400).json({
                success: false,
                error: 'Message is too long (max 5000 characters).',
                errorCode: 'MESSAGE_TOO_LONG'
            });
        }

        if (message.length < 10) {
            return res.status(400).json({
                success: false,
                error: 'Message is too short (min 10 characters).',
                errorCode: 'MESSAGE_TOO_SHORT'
            });
        }

        // Sanitize inputs (basic XSS prevention)
        const sanitizedName = name.trim().replace(/[<>]/g, '');
        const sanitizedEmail = email.trim().toLowerCase();
        const sanitizedMessage = message.trim().replace(/[<>]/g, '');

        const submittedAt = new Date().toLocaleString('en-US', {
            timeZone: 'America/Chicago',
            dateStyle: 'full',
            timeStyle: 'long'
        });

        // Send email to info@starshippsychics.com
        const adminEmailResult = await sendEmail({
            to: 'info@starshippsychics.com',
            ...generateContactFormEmail({
                name: sanitizedName,
                email: sanitizedEmail,
                message: sanitizedMessage,
                submittedAt
            })
        });

        if (!adminEmailResult.success) {
            // Log the error but don't expose details to user
            logErrorFromCatch(
                new Error(`Failed to send contact form email: ${adminEmailResult.error}`),
                'app',
                'contact-form'
            );

            return res.status(500).json({
                success: false,
                error: 'Failed to send your message. Please try emailing us directly at info@starshippsychics.com',
                errorCode: 'EMAIL_SEND_FAILED'
            });
        }

        // Send auto-reply to the user (don't fail the request if this fails)
        try {
            await sendEmail({
                to: sanitizedEmail,
                ...generateContactFormAutoReply({
                    name: sanitizedName
                })
            });
        } catch (autoReplyError) {
            // Log but don't fail the request
            logErrorFromCatch(autoReplyError, 'app', 'contact-form-auto-reply');
        }

        // Success!
        res.json({
            success: true,
            message: 'Thank you! Your message has been sent. We\'ll get back to you within 24-48 hours.'
        });

    } catch (error) {
        logErrorFromCatch(error, 'app', 'contact-form');
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred. Please try again or email us directly at info@starshippsychics.com',
            errorCode: 'INTERNAL_ERROR'
        });
    }
});

export default router;
