/**
 * Base email template wrapper
 * Provides consistent styling and structure for all emails
 */
import { EMAIL_CONFIG } from '../config.js';

const { colors } = EMAIL_CONFIG;

/**
 * Wrap email content in base template
 * @param {string} content - The email body content (HTML)
 * @returns {string} Complete HTML email
 */
export function wrapInBaseTemplate(content) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Email from ${EMAIL_CONFIG.brandName}</title>
    <!--[if mso]>
    <style type="text/css">
        body, table, td {font-family: Arial, sans-serif !important;}
    </style>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${colors.backgroundLight}; font-family: Arial, sans-serif;">
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: ${colors.backgroundLight};">
        <div style="background-color: ${colors.backgroundCard}; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            ${content}
        </div>
    </div>
</body>
</html>
    `.trim();
}
