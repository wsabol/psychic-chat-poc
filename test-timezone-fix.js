/**
 * Test script to verify timezone timestamp fix
 */

// Mock the dependencies
const logErrorFromCatch = (msg, err) => console.error(msg, err);

// Copy the fixed function
function getLocalTimestampForTimezone(timezone = 'UTC') {
  try {
    const now = new Date();
    
    // Get date/time components in user's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(now);
    const get = (type) => parts.find(p => p.type === type)?.value;
    
    // Construct date string in user's timezone
    const year = get('year');
    const month = get('month');
    const day = get('day');
    const hour = get('hour');
    const minute = get('minute');
    const second = get('second');
    
    // Calculate timezone offset for this timezone
    const localeDateString = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
    
    // Create a date string that JS will parse in local system time
    // Then compare to UTC to get the offset for the target timezone
    const localDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const targetDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    
    // Calculate offset in minutes
    const offsetMs = targetDate.getTime() - utcDate.getTime();
    const offsetMinutes = Math.round(offsetMs / 60000);
    const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
    const offsetMins = Math.abs(offsetMinutes) % 60;
    const offsetSign = offsetMinutes >= 0 ? '+' : '-';
    const offsetString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
    
    // Return ISO timestamp with timezone offset
    return `${localeDateString}${offsetString}`;
  } catch (err) {
    logErrorFromCatch(`[TIMEZONE] Error getting local timestamp for ${timezone}, defaulting to UTC`, err);
    return new Date().toISOString();
  }
}

// Test with various timezones
console.log('\n=== TIMEZONE TIMESTAMP TEST ===\n');

const testTimezones = [
  'UTC',
  'America/Chicago',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney'
];

testTimezones.forEach(tz => {
  const timestamp = getLocalTimestampForTimezone(tz);
  console.log(`${tz.padEnd(25)} => ${timestamp}`);
  
  // Parse and verify
  const parsed = new Date(timestamp);
  if (isNaN(parsed.getTime())) {
    console.log(`  ❌ ERROR: Invalid timestamp format`);
  } else {
    console.log(`  ✅ Parses correctly: ${parsed.toString()}`);
  }
});

console.log('\n=== TEST COMPLETE ===\n');
