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

/**
 * Send policy change notification email
 * Notifies users when Terms of Service or Privacy Policy are updated
 * Includes 30-day grace period information
 * 
 * @param {string} userEmail - User's email address
 * @param {Object} changeInfo - Information about the policy change
 * @param {string} changeInfo.documentType - 'terms' | 'privacy' | 'both'
 * @param {string} changeInfo.version - New version number
 * @param {string} changeInfo.changeType - 'MAJOR' | 'MINOR'
 * @param {string} changeInfo.description - Description of changes
 * @param {Date} changeInfo.gracePeriodEnd - Deadline to accept (30 days from notification)
 * @param {boolean} isReminder - Whether this is a reminder email
 * @returns {Promise<Object>} Send result
 */
export async function sendPolicyChangeNotification(userEmail, changeInfo, isReminder = false) {
    try {
        if (!process.env.SENDGRID_API_KEY) {
            throw new Error('Email service not configured');
        }

        const appBaseUrl = process.env.APP_BASE_URL || 'https://starshippsychics.com';
        const loginLink = `${appBaseUrl}/login`;
        
        // Determine document name(s)
        let documentName;
        if (changeInfo.documentType === 'both') {
            documentName = 'Terms of Service and Privacy Policy';
        } else if (changeInfo.documentType === 'terms') {
            documentName = 'Terms of Service';
        } else {
            documentName = 'Privacy Policy';
        }
        
        // Format grace period end date
        const gracePeriodDate = new Date(changeInfo.gracePeriodEnd).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        // Calculate days remaining
        const daysRemaining = Math.ceil((new Date(changeInfo.gracePeriodEnd) - new Date()) / (1000 * 60 * 60 * 24));
        
        // Determine subject and urgency
        let subject, urgencyMessage, headerColor;
        if (isReminder) {
            subject = `Reminder: Action Required - Review Updated ${documentName}`;
            urgencyMessage = `<strong>⚠️ ${daysRemaining} days remaining</strong> - Please log in to review and accept the updated ${documentName}.`;
            headerColor = '#f59e0b'; // Orange
        } else {
            subject = `Important: Updates to Our ${documentName}`;
            urgencyMessage = `You have <strong>30 days</strong> (until ${gracePeriodDate}) to review and accept these changes.`;
            headerColor = '#667eea'; // Brand purple
        }
        
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
                <div style="background-color: #fff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div style="background-color: ${headerColor}; color: white; padding: 15px; border-radius: 6px;">
                            <h1 style="margin: 0; font-size: 24px;">
                                ${isReminder ? '⚠️ Reminder' : '📋 Important Update'}
                            </h1>
                        </div>
                    </div>
                    
                    <h2 style="color: #333; margin-top: 0;">We've Updated Our ${documentName}</h2>
                    
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">
                        ${isReminder ? 'This is a reminder that you' : 'You'} need to review and accept our updated ${documentName}.
                    </p>
                    
                    <div style="background-color: #f0f4ff; border-left: 4px solid ${headerColor}; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0; font-size: 14px; color: #555;">
                            ${urgencyMessage}
                        </p>
                    </div>
                    
                    <div style="margin: 25px 0;">
                        <h3 style="color: #667eea; font-size: 18px; margin-bottom: 10px;">What's Changed?</h3>
                        <p style="font-size: 14px; color: #555; line-height: 1.6;">
                            ${changeInfo.description || 'We\'ve made important updates to better serve you and maintain compliance with current regulations.'}
                        </p>
                    </div>
                    
                    <div style="margin: 30px 0; text-align: center;">
                        <a href="${loginLink}" style="display: inline-block; padding: 14px 40px; background-color: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                            Log In to Review & Accept
                        </a>
                    </div>
                    
                    <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 15px; margin: 20px 0;">
                        <h4 style="margin: 0 0 10px 0; color: #856404; font-size: 16px;">⏰ Important Deadline</h4>
                        <p style="margin: 0; font-size: 14px; color: #856404; line-height: 1.5;">
                            <strong>By ${gracePeriodDate}</strong>, you must log in and accept the updated ${documentName}. 
                            If you do not accept by this date, you will be automatically logged out and unable to access your account until you accept the new terms.
                        </p>
                    </div>
                    
                    <div style="margin: 25px 0;">
                        <h3 style="color: #667eea; font-size: 18px; margin-bottom: 10px;">What You Need to Do</h3>
                        <ol style="font-size: 14px; color: #555; line-height: 1.8; padding-left: 20px;">
                            <li>Log in to your Psychic Chat account</li>
                            <li>Review the updated ${documentName}</li>
                            <li>Accept the changes to continue using your account</li>
                        </ol>
                    </div>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                    
                    <p style="font-size: 12px; color: #999; line-height: 1.5;">
                        We value your privacy and are committed to transparency. If you have any questions about these changes, 
                        please contact our support team.
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
                }
            }
        };

        const result = await sgMail.send(msg);

        return {
            success: true,
            messageId: result[0].headers['x-message-id'],
            emailType: isReminder ? 'policy_reminder' : 'policy_change'
        };
    } catch (error) {
        logErrorFromCatch(error, 'app', 'email');
        return {
            success: false,
            error: error.message
        };
    }
}
