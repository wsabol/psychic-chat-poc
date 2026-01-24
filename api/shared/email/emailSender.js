/**
 * Core email sending functionality
 * Centralizes all SendGrid interaction and error handling
 */
import sgMail from '@sendgrid/mail';
import { validateEmailConfig, getSendGridApiKey, EMAIL_CONFIG } from './config.js';
import { logErrorFromCatch } from '../errorLogger.js';

// Initialize SendGrid
const apiKey = getSendGridApiKey();
if (apiKey) {
    sgMail.setApiKey(apiKey);
}

/**
 * Send an email using SendGrid
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML email content
 * @param {Object} [options.trackingSettings] - SendGrid tracking settings
 * @param {string} [options.from] - Sender email (defaults to config)
 * @returns {Promise<Object>} Send result with success status and messageId or error
 */
export async function sendEmail(options) {
    try {
        // Validate configuration
        validateEmailConfig();
        
        const { to, subject, html, trackingSettings, from = EMAIL_CONFIG.fromEmail } = options;
        
        // Validate required fields
        if (!to || !subject || !html) {
            throw new Error('Missing required email fields: to, subject, html');
        }
        
        // Build message object
        const msg = {
            to,
            from,
            subject,
            html
        };
        
        // Add tracking settings if provided
        if (trackingSettings) {
            msg.trackingSettings = trackingSettings;
        }
        
        // Send email
        const result = await sgMail.send(msg);
        
        return {
            success: true,
            messageId: result[0]?.headers['x-message-id'] || 'unknown'
        };
    } catch (error) {
        // Log error for debugging
        logErrorFromCatch(error, 'app', 'email');
        
        return {
            success: false,
            error: error.message || 'Unknown email error'
        };
    }
}

/**
 * Send an email using a template generator function
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {Function} options.templateFn - Template generator function
 * @param {Object} options.templateData - Data to pass to template function
 * @returns {Promise<Object>} Send result
 */
export async function sendTemplatedEmail(options) {
    try {
        const { to, templateFn, templateData } = options;
        
        if (!to || !templateFn || !templateData) {
            throw new Error('Missing required fields: to, templateFn, templateData');
        }
        
        // Generate email content from template
        const emailContent = templateFn(templateData);
        
        // Handle templates that return {subject, html, ...} vs just html
        const emailOptions = typeof emailContent === 'object' 
            ? { to, ...emailContent }
            : { to, html: emailContent };
        
        // Send the email
        return await sendEmail(emailOptions);
    } catch (error) {
        logErrorFromCatch(error, 'app', 'email');
        
        return {
            success: false,
            error: error.message || 'Template email error'
        };
    }
}
