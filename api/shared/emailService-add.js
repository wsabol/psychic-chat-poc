// Add this to api/shared/emailService.js at the end

export async function sendReEngagementEmail({ email, userId, deletionDate, reactivationLink }) {
    try {
        if (!process.env.SENDGRID_API_KEY) {
            console.warn('[EMAIL] SendGrid not configured, skipping re-engagement email');
            return false;
        }

        const msg = {
            to: email,
            from: process.env.SENDGRID_FROM_EMAIL || 'noreply@starshippsychics.com',
            subject: 'Your Psychic Chat History Will Be Deleted Soon',
            html: `
                <h2>Your Account Will Be Deleted</h2>
                <p>Your account will be permanently deleted on <strong>${deletionDate}</strong>.</p>
                <p><a href="${reactivationLink}">Click here to reactivate your account</a></p>
                <p>Best regards,<br>The Psychic Chat Team</p>
            `
        };

        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        await sgMail.send(msg);
        
        console.log('[EMAIL] Re-engagement email sent to', email);
        return true;
    } catch (error) {
        console.error('[EMAIL] Re-engagement error:', error.message);
        return false;
    }
}
