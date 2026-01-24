/**
 * Email service configuration and validation
 */

export const EMAIL_CONFIG = {
    fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@starshippsychics.com',
    appBaseUrl: process.env.APP_BASE_URL || 'https://starshippsychics.com',
    brandName: 'Psychic Chat',
    brandTagline: 'Your Personal Astrology Guide',
    
    // Brand colors
    colors: {
        primary: '#667eea',
        warning: '#f59e0b',
        info: '#3b82f6',
        success: '#10b981',
        text: '#333',
        textLight: '#666',
        textMuted: '#999',
        border: '#ddd',
        backgroundLight: '#f5f5f5',
        backgroundCard: '#fff',
        backgroundHighlight: '#f0f4ff',
        backgroundWarning: '#fff3cd',
        borderWarning: '#ffc107',
        textWarning: '#856404'
    },
    
    // Email expiry times (in minutes)
    expiry: {
        verification: 10,
        passwordReset: 15,
        twoFactor: 10,
        generic: 15
    }
};

/**
 * Validate that SendGrid is configured
 * @throws {Error} If SendGrid API key is missing
 */
export function validateEmailConfig() {
    if (!process.env.SENDGRID_API_KEY) {
        throw new Error('Email service not configured');
    }
}

/**
 * Get SendGrid API key
 * @returns {string} The API key
 */
export function getSendGridApiKey() {
    return process.env.SENDGRID_API_KEY;
}
