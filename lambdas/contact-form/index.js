/**
 * Standalone Contact Form Lambda
 * Sends emails without requiring database
 */

import sgMail from '@sendgrid/mail';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = 'info@starshippsychics.com';

sgMail.setApiKey(SENDGRID_API_KEY);

export const handler = async (event) => {
    // CORS headers for all responses
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept',
        'Access-Control-Max-Age': '86400',
    };

    // Handle CORS preflight
    if (event.requestContext && event.requestContext.http && event.requestContext.http.method === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    try {
        const body = JSON.parse(event.body);
        const { name, email, message } = body;

        // Validation
        if (!name || !email || !message) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({
                    success: false,
                    error: 'Missing required fields'
                })
            };
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({
                    success: false,
                    error: 'Invalid email format'
                })
            };
        }

        // Send email to admin
        await sgMail.send({
            to: FROM_EMAIL,
            from: FROM_EMAIL,
            replyTo: email,
            subject: `Contact Form: ${name}`,
            html: `
                <h2>New Contact Form Submission</h2>
                <p><strong>From:</strong> ${name}</p>
                <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                <p><strong>Message:</strong></p>
                <p>${message.replace(/\n/g, '<br>')}</p>
                <p><small>Submitted: ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })}</small></p>
            `
        });

        // Send auto-reply
        try {
            await sgMail.send({
                to: email,
                from: FROM_EMAIL,
                subject: 'Thank You for Contacting Starship Psychics',
                html: `
                    <h2>Thank You for Contacting Us</h2>
                    <p>Hi ${name},</p>
                    <p>Thank you for reaching out to Starship Psychics! We have received your message and will respond within 24-48 hours.</p>
                    <p>Warm regards,<br>The Starship Psychics Team</p>
                `
            });
        } catch (err) {
            console.error('Auto-reply failed:', err);
            // Don't fail the request if auto-reply fails
        }

        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                success: true,
                message: 'Thank you! Your message has been sent. We\'ll get back to you within 24-48 hours.'
            })
        };

    } catch (error) {
        console.error('Contact form error:', error);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                success: false,
                error: 'Failed to send message. Please email us directly at info@starshippsychics.com'
            })
        };
    }
};
