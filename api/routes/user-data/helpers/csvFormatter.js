/**
 * CSV Formatting Utilities
 */

export function convertToCSV(data) {
  let csv = '';

  csv += 'PERSONAL INFORMATION\n';
  csv += 'Field,Value\n';
  const personal = data.personal_information;
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

  if (data.consents) {
    csv += 'CONSENTS\n';
    csv += 'Consent Type,Granted,Date\n';
    csv += `Astrology,${data.consents.consent_astrology},${data.consents.agreed_at}\n`;
    csv += `Health Data,${data.consents.consent_health_data},${data.consents.agreed_at}\n`;
    csv += `Chat Analysis,${data.consents.consent_chat_analysis},${data.consents.agreed_at}\n\n`;
  }

  csv += 'CHAT MESSAGES\n';
  csv += 'Date,Role,Message\n';
  data.chat_messages.forEach(msg => {
    csv += `${msg.created_at},${msg.role},"${escapeCSV(msg.content)}"\n`;
  });
  csv += '\n';

  csv += 'ASTROLOGY READINGS\n';
  csv += 'Date,Type,Reading\n';
  data.astrology_readings.forEach(reading => {
    csv += `${reading.created_at},${reading.reading_type},"${escapeCSV(reading.content)}"\n`;
  });

  return csv;
}

export function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return stringValue.replace(/"/g, '""');
  }
  return stringValue;
}
