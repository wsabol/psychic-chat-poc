/**
 * Contact Form Email Template
 * Sends contact form submissions to info@starshippsychics.com
 */

import { EMAIL_CONFIG } from '../config.js';
import { createHeader, createParagraph, createFooter } from './components.js';
import { wrapInBaseTemplate } from './baseTemplate.js';

/**
 * Generate contact form submission email HTML
 * @param {Object} data - Template data
 * @param {string} data.name - Sender's name
 * @param {string} data.email - Sender's email
 * @param {string} data.message - Message content
 * @param {string} data.submittedAt - Submission timestamp
 * @returns {Object} Email content with subject and HTML
 */
export function generateContactFormEmail(data) {
    const { name, email, message, submittedAt } = data;

    const content = `
        ${createHeader('New Contact Form Submission')}
        
        <div style="background-color: #f7fafc; border-left: 4px solid ${EMAIL_CONFIG.colors.primary}; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; color: ${EMAIL_CONFIG.colors.textLight};"><strong>From:</strong></p>
            <p style="margin: 0 0 20px 0; color: ${EMAIL_CONFIG.colors.text}; font-size: 16px;">${name}</p>
            
            <p style="margin: 0 0 10px 0; color: ${EMAIL_CONFIG.colors.textLight};"><strong>Email:</strong></p>
            <p style="margin: 0 0 20px 0; color: ${EMAIL_CONFIG.colors.text}; font-size: 16px;">
                <a href="mailto:${email}" style="color: ${EMAIL_CONFIG.colors.primary}; text-decoration: none;">${email}</a>
            </p>
            
            <p style="margin: 0 0 10px 0; color: ${EMAIL_CONFIG.colors.textLight};"><strong>Message:</strong></p>
            <div style="background-color: white; padding: 15px; border-radius: 8px; margin-top: 10px;">
                <p style="margin: 0; color: ${EMAIL_CONFIG.colors.text}; white-space: pre-wrap; line-height: 1.6;">${message}</p>
            </div>
        </div>
        
        ${createParagraph(`Submitted: ${submittedAt}`, '12px', EMAIL_CONFIG.colors.textLight)}
        
        ${createFooter('This email was sent from the Starship Psychics contact form.')}
    `;

    const html = wrapInBaseTemplate(content);

    return {
        subject: `Contact Form: ${name}`,
        html,
        replyTo: email // Allow direct reply to the sender
    };
}

/**
 * Generate auto-reply email to sender
 * @param {Object} data - Template data
 * @param {string} data.name - Sender's name
 * @returns {Object} Email content with subject and HTML
 */
export function generateContactFormAutoReply(data) {
    const { name } = data;

    const content = `
        ${createHeader('Thank You for Contacting Us')}
        
        ${createParagraph(`Hi ${name},`)}
        
        ${createParagraph('Thank you for reaching out to Starship Psychics! We have received your message and will respond within 24-48 hours.')}
        
        ${createParagraph('In the meantime, feel free to explore our website and learn more about our cosmic guidance services.')}
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://starshippsychics.com" 
               style="display: inline-block; background-color: ${EMAIL_CONFIG.colors.primary}; color: white; 
                      padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Visit Our Website
            </a>
        </div>
        
        ${createParagraph('We look forward to connecting with you!')}
        
        ${createParagraph('Warm regards,<br>The Starship Psychics Team', '16px')}
        
        ${createFooter()}
    `;

    const html = wrapInBaseTemplate(content);

    return {
        subject: 'Thank You for Contacting Starship Psychics',
        html
    };
}
