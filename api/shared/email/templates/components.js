/**
 * Reusable email components
 */
import { EMAIL_CONFIG } from '../config.js';

const { colors, brandName, brandTagline } = EMAIL_CONFIG;

/**
 * Generate email header
 * @param {string} title - Header title
 * @param {string} backgroundColor - Background color (default: primary)
 * @param {string} icon - Optional emoji icon
 * @returns {string} HTML for header
 */
export function createHeader(title, backgroundColor = colors.primary, icon = '') {
    return `
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="background-color: ${backgroundColor}; color: white; padding: 15px; border-radius: 6px;">
                <h1 style="margin: 0; font-size: 24px;">
                    ${icon ? `${icon} ` : ''}${title}
                </h1>
            </div>
        </div>
    `;
}

/**
 * Generate verification code display
 * @param {string} code - The verification code
 * @returns {string} HTML for code display
 */
export function createCodeDisplay(code) {
    return `
        <h1 style="font-family: monospace; letter-spacing: 5px; font-size: 32px; color: ${colors.primary}; text-align: center;">
            ${code}
        </h1>
    `;
}

/**
 * Generate call-to-action button
 * @param {string} text - Button text
 * @param {string} url - Button URL
 * @param {string} backgroundColor - Background color (default: primary)
 * @returns {string} HTML for button
 */
export function createButton(text, url, backgroundColor = colors.primary) {
    return `
        <div style="margin: 30px 0; text-align: center;">
            <a href="${url}" style="display: inline-block; padding: 14px 40px; background-color: ${backgroundColor}; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                ${text}
            </a>
        </div>
    `;
}

/**
 * Generate info box
 * @param {string} content - Box content (HTML allowed)
 * @param {string} borderColor - Left border color
 * @param {string} backgroundColor - Background color
 * @returns {string} HTML for info box
 */
export function createInfoBox(content, borderColor = colors.primary, backgroundColor = colors.backgroundHighlight) {
    return `
        <div style="background-color: ${backgroundColor}; border-left: 4px solid ${borderColor}; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: ${colors.textLight};">
                ${content}
            </p>
        </div>
    `;
}

/**
 * Generate warning box
 * @param {string} title - Warning title
 * @param {string} content - Warning content
 * @returns {string} HTML for warning box
 */
export function createWarningBox(title, content) {
    return `
        <div style="background-color: ${colors.backgroundWarning}; border: 1px solid ${colors.borderWarning}; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: ${colors.textWarning}; font-size: 16px;">${title}</h4>
            <p style="margin: 0; font-size: 14px; color: ${colors.textWarning}; line-height: 1.5;">
                ${content}
            </p>
        </div>
    `;
}

/**
 * Generate email footer
 * @param {string} additionalText - Optional additional text before the standard footer
 * @returns {string} HTML for footer
 */
export function createFooter(additionalText = '') {
    return `
        <hr style="border: none; border-top: 1px solid ${colors.border}; margin: 30px 0;">
        ${additionalText ? `
        <p style="font-size: 12px; color: ${colors.textMuted}; line-height: 1.5;">
            ${additionalText}
        </p>
        ` : ''}
        <p style="font-size: 12px; color: ${colors.textMuted}; margin-top: 20px; text-align: center;">
            ${brandName} - ${brandTagline}<br>
            <em>Confidential and secure communication</em>
        </p>
    `;
}

/**
 * Generate ordered list
 * @param {string[]} items - List items
 * @returns {string} HTML for ordered list
 */
export function createOrderedList(items) {
    const listItems = items.map(item => `<li>${item}</li>`).join('');
    return `
        <ol style="font-size: 14px; color: ${colors.textLight}; line-height: 1.8; padding-left: 20px;">
            ${listItems}
        </ol>
    `;
}

/**
 * Generate section with heading
 * @param {string} heading - Section heading
 * @param {string} content - Section content (HTML allowed)
 * @returns {string} HTML for section
 */
export function createSection(heading, content) {
    return `
        <div style="margin: 25px 0;">
            <h3 style="color: ${colors.primary}; font-size: 18px; margin-bottom: 10px;">${heading}</h3>
            <p style="font-size: 14px; color: ${colors.textLight}; line-height: 1.6;">
                ${content}
            </p>
        </div>
    `;
}

/**
 * Generate paragraph
 * @param {string} content - Paragraph content
 * @param {string} fontSize - Font size (default: 16px)
 * @returns {string} HTML for paragraph
 */
export function createParagraph(content, fontSize = '16px') {
    return `
        <p style="font-size: ${fontSize}; color: ${colors.text}; line-height: 1.6;">
            ${content}
        </p>
    `;
}
