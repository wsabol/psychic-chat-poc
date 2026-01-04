/**
 * Data export utilities for user-data operations
 * Handles data formatting and transformation for export
 */

import {
  fetchPersonalInfo,
  fetchSettings,
  fetchConsents,
  fetchMessages,
  fetchReadings,
  fetchAuditLogs
} from './queries.js';

/**
 * Compile complete user data for export
 */
export async function compileExportData(userId, userIdHash) {
  const [personalInfo, settings, consents, messages, readings, auditLogs] = await Promise.all([
    fetchPersonalInfo(userId),
    fetchSettings(userIdHash),
    fetchConsents(userId),
    fetchMessages(userIdHash),
    fetchReadings(userId),
    fetchAuditLogs(userId)
  ]);

  return {
    export_timestamp: new Date().toISOString(),
    personal_information: personalInfo.rows[0] || null,
    settings: settings.rows[0] || null,
    consents: consents.rows[0] || null,
    chat_messages: messages.rows,
    astrology_readings: readings.rows,
    audit_log: auditLogs.rows.map(log => ({
      timestamp: log.created_at,
      action: log.action,
      ip_address: log.ip_address
    }))
  };
}

/**
 * Convert export data to CSV format
 */
export function convertToCSV(data) {
  let csv = '';

  // Personal Information Section
  csv += 'PERSONAL INFORMATION\n';
  csv += 'Field,Value\n';
  const personal = data.personal_information;
  if (personal) {
    csv += `User ID,${personal.user_id}\n`;
    csv += `First Name,${escapeCSV(personal.first_name)}\n`;
    csv += `Last Name,${escapeCSV(personal.last_name)}\n`;
    csv += `Email,${escapeCSV(personal.email)}\n`;
    csv += `Phone,${escapeCSV(personal.phone_number)}\n`;
    csv += `Gender,${escapeCSV(personal.sex)}\n`;
    csv += `Familiar Name,${escapeCSV(personal.familiar_name)}\n`;
    csv += `Birth Date,${escapeCSV(personal.birth_date)}\n`;
    csv += `Birth City,${escapeCSV(personal.birth_city)}\n`;
    csv += `Birth Timezone,${escapeCSV(personal.birth_timezone)}\n`;
    csv += `Account Created,${personal.created_at}\n\n`;
  }

  // Consents Section
  if (data.consents) {
    csv += 'CONSENTS\n';
    csv += 'Consent Type,Granted,Date\n';
    csv += `Astrology,${data.consents.consent_astrology},${data.consents.agreed_at}\n`;
    csv += `Health Data,${data.consents.consent_health_data},${data.consents.agreed_at}\n`;
    csv += `Chat Analysis,${data.consents.consent_chat_analysis},${data.consents.agreed_at}\n\n`;
  }

  // Chat Messages Section
  csv += 'CHAT MESSAGES\n';
  csv += 'Date,Role,Message\n';
  data.chat_messages.forEach(msg => {
    csv += `${msg.created_at},${msg.role},"${escapeCSV(msg.content)}"\n`;
  });
  csv += '\n';

  // Astrology Readings Section
  csv += 'ASTROLOGY READINGS\n';
  csv += 'Date,Type,Reading\n';
  data.astrology_readings.forEach(reading => {
    csv += `${reading.created_at},${reading.reading_type},"${escapeCSV(reading.content)}"\n`;
  });

  return csv;
}

/**
 * Escape CSV values for safe inclusion in CSV
 */
export function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return stringValue.replace(/"/g, '""');
  }
  return stringValue;
}

/**
 * Generate filename for export
 */
export function generateExportFilename(userId, format = 'json') {
  const date = new Date().toISOString().split('T')[0];
  return `psychic-chat-export-${userId}-${date}.${format}`;
}
