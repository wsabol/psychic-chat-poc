/**
 * Build email content for admin new IP login with 2FA code
 * Combines alert message with 2FA code in ONE email
 */

import { logErrorFromCatch } from '../shared/errorLogger.js';

export async function buildAdminNewIPEmailHTML(code, ipAddress, deviceName) {
  try {
    // Get geolocation
    let location = 'Unknown, Unknown';
    try {
      const geo = await fetch(`https://ipapi.co/${ipAddress}/json/`)
        .then(r => r.json())
        .catch(() => ({}));
      
      location = `${geo.city || 'Unknown'}, ${geo.country_name || 'Unknown'}`;
    } catch (geoErr) {
      // Use default location if geolocation fails
    }
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #fff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #e74c3c;">🔐 New Login Location - 2FA Required</h2>
          
          <p style="font-size: 16px; margin: 20px 0;"><strong>Login attempt from a new location detected.</strong></p>
          
          <div style="background-color: #f0f8ff; padding: 25px; border-radius: 8px; margin: 25px 0; text-align: center; border: 2px solid #667eea;">
            <p style="margin: 0; font-size: 12px; color: #666; font-weight: bold;">YOUR 2FA CODE (expires in 10 minutes):</p>
            <h1 style="font-family: monospace; letter-spacing: 6px; font-size: 36px; color: #667eea; margin: 15px 0; font-weight: bold;">${code}</h1>
          </div>
          
          <h3 style="color: #333; margin-top: 25px;">New Location Details:</h3>
          
          <table style="border: 1px solid #ddd; width: 100%; margin: 15px 0;">
            <tr style="background-color: #f5f5f5;">
              <td style="padding: 10px; font-weight: bold; width: 30%;">IP Address:</td>
              <td style="padding: 10px; font-family: monospace;">${ipAddress}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold;">Location:</td>
              <td style="padding: 10px;">${location}</td>
            </tr>
            <tr style="background-color: #f5f5f5;">
              <td style="padding: 10px; font-weight: bold;">Device:</td>
              <td style="padding: 10px;">${deviceName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold;">Time:</td>
              <td style="padding: 10px;">${new Date().toLocaleString()}</td>
            </tr>
          </table>
          
          <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #f39c12; margin: 25px 0;">
            <strong>⚠️ What to do:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li><strong>If this was YOU:</strong> Enter the code above to complete login and trust this device for future visits</li>
              <li><strong>If this was NOT you:</strong> Do NOT enter the code. Change your password immediately.</li>
            </ul>
          </div>
          
          <p style="color: #999; font-size: 11px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 15px;">
            Security: This 2FA code is unique and expires in 10 minutes. If you did not initiate this login, someone may have your password. Change it immediately.
          </p>
        </div>
      </div>
    `;
  } catch (err) {
    logErrorFromCatch(err, 'admin', 'build admin new IP email');
    throw err;
  }
}
