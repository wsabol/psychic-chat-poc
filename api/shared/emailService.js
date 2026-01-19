import sgMail from '@sendgrid/mail';
import { logErrorFromCatch } from './errorLogger.js';

// Initialize SendGrid
if (!process.env.SENDGRID_API_KEY) {
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@starshippsychics.com';

/**
 * Send email verification email
 */
export async function sendEmailVerification(userEmail, verificationCode) {
    try {
        if (!process.env.SENDGRID_API_KEY) {
            throw new Error('Email service not configured');
        }

        const msg = {
            to: userEmail,
            from: fromEmail,
            subject: 'Verify Your Email - Psychic Chat',
            html: `
                <h2>Verify Your Email</h2>
                <p>Welcome to Psychic Chat! Please verify your email address to complete registration.</p>
                <p>Your verification code is:</p>
                <h1 style="font-family: monospace; letter-spacing: 5px; font-size: 32px; color: #667eea;">
                    ${verificationCode}
                </h1>
                <p>This code will expire in 10 minutes.</p>
                <p>If you did not create this account, please ignore this email.</p>
                <hr>
                <p style="color: #999; font-size: 12px;">Psychic Chat - Your Personal Astrology Guide</p>
            `
        };

        const result = await sgMail.send(msg);

        return {
            success: true,
            messageId: result[0].headers['x-message-id']
        };
    } catch (error) {
        logErrorFromCatch(error, 'app', 'email');
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Send password reset email with code
 */
export async function sendPasswordResetEmail(userEmail, resetCode) {
    try {
        if (!process.env.SENDGRID_API_KEY) {
            throw new Error('Email service not configured');
        }

        const msg = {
            to: userEmail,
            from: fromEmail,
            subject: 'Reset Your Password - Psychic Chat',
            html: `
                <h2>Reset Your Password</h2>
                <p>We received a request to reset your password. If you did not make this request, please ignore this email.</p>
                <p>Your password reset code is:</p>
                <h1 style="font-family: monospace; letter-spacing: 5px; font-size: 32px; color: #667eea;">
                    ${resetCode}
                </h1>
                <p>This code will expire in 15 minutes.</p>
                <p>Use this code to reset your password. You will need to confirm your new password.</p>
                <hr>
                <p style="color: #999; font-size: 12px;">Psychic Chat - Your Personal Astrology Guide</p>
            `
        };

        const result = await sgMail.send(msg);

        return {
            success: true,
            messageId: result[0].headers['x-message-id']
        };
    } catch (error) {
        logErrorFromCatch(error, 'app', 'email');
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Send email verification code (for recovery email setup, phone verification, etc)
 */
export async function sendEmailVerificationCode(userEmail, code) {
    try {
        if (!process.env.SENDGRID_API_KEY) {
            throw new Error('Email service not configured');
        }

        const msg = {
            to: userEmail,
            from: fromEmail,
            subject: 'Verification Code - Psychic Chat',
            html: `
                <h2>Verification Code</h2>
                <p>Your verification code is:</p>
                <h1 style="font-family: monospace; letter-spacing: 5px; font-size: 32px; color: #667eea;">
                    ${code}
                </h1>
                <p>This code will expire in 15 minutes.</p>
                <p>If you did not request this code, please ignore this email.</p>
                <hr>
                <p style="color: #999; font-size: 12px;">Psychic Chat - Your Personal Astrology Guide</p>
            `
        };

        const result = await sgMail.send(msg);

        return {
            success: true,
            messageId: result[0].headers['x-message-id']
        };
    } catch (error) {
        logErrorFromCatch(error, 'app', 'email');
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Send 2FA code via email
 */
export async function send2FACodeEmail(userEmail, code) {
    try {
        if (!process.env.SENDGRID_API_KEY) {
            throw new Error('Email service not configured');
        }

        const msg = {
            to: userEmail,
            from: fromEmail,
            subject: 'Two-Factor Authentication Code - Psychic Chat',
            html: `
                <h2>Two-Factor Authentication</h2>
                <p>Your two-factor authentication code is:</p>
                <h1 style="font-family: monospace; letter-spacing: 5px; font-size: 32px; color: #667eea;">
                    ${code}
                </h1>
                <p>This code will expire in 10 minutes.</p>
                <p>If you did not request this code, please ignore this email.</p>
                <hr>
                <p style="color: #999; font-size: 12px;">Psychic Chat - Your Personal Astrology Guide</p>
            `
        };

        const result = await sgMail.send(msg);

        return {
            success: true,
            messageId: result[0].headers['x-message-id']
        };
    } catch (error) {
        logErrorFromCatch(error, 'app', 'email');
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Send account re-engagement email to users with deleted accounts
 * Allows them to reactivate their account or unsubscribe from future emails
 */
export async function sendAccountReengagementEmail(userEmail, userId, emailType) {
    try {
        if (!process.env.SENDGRID_API_KEY) {
            throw new Error('Email service not configured');
        }

        const appBaseUrl = process.env.APP_BASE_URL || 'https://starshippsychics.com';
        const reactivateLink = `${appBaseUrl}/reactivate?userId=${encodeURIComponent(userId)}&token=${generateReactivationToken(userId)}`;
        const unsubscribeLink = `${appBaseUrl}/unsubscribe-reengagement?userId=${encodeURIComponent(userId)}&token=${generateReactivationToken(userId)}`;

        const subject = emailType === '6_month'
            ? 'We Miss You! Your Psychic Chat Account is Ready to Reactivate'
            : 'Last Chance: Reactivate Your Psychic Chat Account';

        const headline = emailType === '6_month'
            ? 'We Miss You!'
            : 'Your Account is About to Be Deleted';

        const message = emailType === '6_month'
            ? 'It\'s been 6 months since you requested to delete your account. We understand life changes, and we\'d love to welcome you back whenever you\'re ready. Your data is safely stored and can be reactivated at any time.'
            : 'It\'s been a year since you requested account deletion. This is your final notice before permanent data deletion occurs in 6 months. If you\'d like to keep your account active, simply reactivate it now!';

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
                <div style="background-color: #fff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h1 style="color: #667eea; text-align: center; margin-top: 0;">${headline}</h1>
                    
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">${message}</p>
                    
                    <div style="margin: 30px 0; text-align: center;">
                        <a href="${reactivateLink}" style="display: inline-block; padding: 12px 40px; background-color: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                            Reactivate My Account
                        </a>
                    </div>
                    
                    <p style="font-size: 14px; color: #666; line-height: 1.6;">
                        Reactivating is quick and easy - all your data will be restored and your account will be fully active.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                    
                    <p style="font-size: 12px; color: #999;">
                        If you prefer not to receive these emails, you can 
                        <a href="${unsubscribeLink}" style="color: #667eea; text-decoration: none;">
                            unsubscribe from re-engagement emails
                        </a>.
                    </p>
                    
                    <p style="font-size: 12px; color: #999; margin-top: 20px; text-align: center;">
                        Psychic Chat - Your Personal Astrology Guide<br>
                        <em>Confidential and secure communication</em>
                    </p>
                </div>
            </div>
        `;

        const msg = {
            to: userEmail,
            from: fromEmail,
            subject: subject,
            html: html,
            trackingSettings: {
                clickTracking: {
                    enable: true,
                    enableText: true
                },
                openTracking: {
                    enable: true
                },
                unsubscribeTracking: {
                    enable: true,
                    text: 'Unsubscribe from re-engagement emails'
                }
            }
        };

        const result = await sgMail.send(msg);

        return {
            success: true,
            messageId: result[0].headers['x-message-id']
        };
    } catch (error) {
        logErrorFromCatch(error, 'app', 'email');
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Generate a simple reactivation token
 * In production, consider using JWT or a secure token generation library
 */
function generateReactivationToken(userId) {
    // This is a simple implementation - in production use proper JWT or secure token generation
    const hash = Buffer.from(`${userId}:${Date.now()}`).toString('base64');
    return encodeURIComponent(hash);
}

