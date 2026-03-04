/**
 * HTML Primitives for Lambda Email Templates
 *
 * Locale-independent building blocks shared by every template.
 * All styling is inline so emails render correctly in all clients.
 *
 * Exports:
 *   wrapInBase(content, lang?)     – full HTML document wrapper
 *   para(text, size?)              – styled <p> block
 *   btn(text, url, color?)         – centred CTA button
 *   infoBox(text, color?)          – left-bordered info callout
 *   warningBox(title, body)        – yellow warning callout
 *   optOutFooter(text?, url?)      – lifecycle / marketing email footer
 *   transactionalFooter()          – billing / service email footer
 */

import { CONFIG } from './config.js';

const C = CONFIG.colors;

// ─── Document wrapper ────────────────────────────────────────────────────────

/**
 * Wraps `content` in a full HTML document with the brand shell.
 *
 * @param {string} content  Inner HTML (everything between the white card's borders)
 * @param {string} [lang]   BCP-47 language tag for the <html> element, e.g. 'en', 'es'
 */
export function wrapInBase(content, lang = 'en') {
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Email from ${CONFIG.brandName}</title>
</head>
<body style="margin:0;padding:0;background-color:${C.backgroundLight};font-family:Arial,sans-serif;">
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#fff;border-radius:8px;padding:30px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
      ${content}
    </div>
    <p style="text-align:center;font-size:12px;color:#999;margin-top:15px;">
      &copy; ${new Date().getFullYear()} ${CONFIG.brandName}. All rights reserved.
    </p>
  </div>
</body>
</html>`.trim();
}

// ─── Inline elements ─────────────────────────────────────────────────────────

/**
 * Styled paragraph block.
 *
 * @param {string} text
 * @param {string} [size='16px']
 */
export const para = (text, size = '16px') =>
  `<p style="font-size:${size};color:${C.text};line-height:1.6;margin-bottom:15px;">${text}</p>`;

/**
 * Centred call-to-action button.
 *
 * @param {string} text
 * @param {string} url
 * @param {string} [color]  Background colour (defaults to brand primary)
 */
export const btn = (text, url, color = C.primary) =>
  `<div style="text-align:center;margin:25px 0;">
    <a href="${url}"
       style="background-color:${color};color:#fff;padding:12px 30px;text-decoration:none;
              border-radius:5px;font-weight:bold;display:inline-block;">${text}</a>
   </div>`;

/**
 * Left-bordered info callout box.
 *
 * @param {string} text
 * @param {string} [color]  Border/accent colour (defaults to brand primary)
 */
export const infoBox = (text, color = C.primary) =>
  `<div style="background:#f0f4ff;border-left:4px solid ${color};padding:15px;
               margin:20px 0;border-radius:4px;">
    <p style="margin:0;font-size:14px;color:${C.text};line-height:1.6;">${text}</p>
   </div>`;

/**
 * Yellow warning callout with a bold title and body paragraph.
 *
 * @param {string} title
 * @param {string} body
 */
export const warningBox = (title, body) =>
  `<div style="background:${C.backgroundWarning};border:1px solid ${C.borderWarning};
               border-radius:4px;padding:15px;margin:20px 0;">
    <strong style="color:#856404;">${title}</strong>
    <p style="margin:8px 0 0;font-size:14px;color:#856404;line-height:1.6;">${body}</p>
   </div>`;

// ─── Footers ─────────────────────────────────────────────────────────────────

/**
 * Standard opt-out footer for lifecycle / marketing emails.
 * Renders an unsubscribe link only when `unsubscribeUrl` is provided.
 *
 * @param {string} [unsubscribeText]  Link anchor text
 * @param {string} [unsubscribeUrl]   Full unsubscribe URL; omit to hide the link
 */
export const optOutFooter = (unsubscribeText, unsubscribeUrl) => {
  const unsubLink = unsubscribeUrl
    ? `<br>Or <a href="${unsubscribeUrl}" style="color:${C.primary};text-decoration:none;">${unsubscribeText ?? 'unsubscribe'}</a>.`
    : '';
  return `<div style="margin-top:30px;padding-top:20px;border-top:1px solid ${C.border};text-align:center;">
    <p style="font-size:12px;color:#999;line-height:1.6;">
      You're receiving this because you have an account with ${CONFIG.brandName}.<br>
      To update your preferences, visit your
      <a href="${CONFIG.appBaseUrl}/settings" style="color:${C.primary};text-decoration:none;">account settings</a>.
      ${unsubLink}
    </p>
  </div>`;
};

/**
 * Minimal footer for transactional (billing) emails.
 * No unsubscribe link — users cannot opt out of billing notifications.
 */
export const transactionalFooter = () =>
  `<div style="margin-top:30px;padding-top:20px;border-top:1px solid ${C.border};text-align:center;">
    <p style="font-size:12px;color:#999;line-height:1.6;">
      This is a service notification about your ${CONFIG.brandName} subscription.<br>
      Questions? <a href="mailto:${CONFIG.supportEmail}" style="color:${C.primary};text-decoration:none;">${CONFIG.supportEmail}</a>.
    </p>
   </div>`;
