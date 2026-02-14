/**
 * Date Formatting Utilities
 * Shared date conversion functions used across PersonalInfoPage and other forms
 */

/**
 * Format date from storage format (YYYY-MM-DD) to display format (dd-MMM-yyyy)
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {string} Date in dd-MMM-yyyy format
 */
export function formatDateForDisplay(dateString) {
  if (!dateString) return '';
  try {
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = String(parts[2]).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[monthIndex];
    
    if (!month) return dateString;
    return `${day}-${month}-${year}`;
  } catch (e) {
    return dateString;
  }
}

/**
 * Parse date from display format (dd-MMM-yyyy or variations) to storage format (YYYY-MM-DD)
 * @param {string} dateString - Date in flexible format (dd-mmm-yyyy, dd/mm/yyyy, etc.)
 * @returns {string} Date in YYYY-MM-DD format
 */
export function parseDateForStorage(dateString) {
  if (!dateString) return '';
  try {
    const months = {
      'jan': '01', 'january': '01',
      'feb': '02', 'february': '02',
      'mar': '03', 'march': '03',
      'apr': '04', 'april': '04',
      'may': '05',
      'jun': '06', 'june': '06',
      'jul': '07', 'july': '07',
      'aug': '08', 'august': '08',
      'sep': '09', 'sept': '09', 'september': '09',
      'oct': '10', 'october': '10',
      'nov': '11', 'november': '11',
      'dec': '12', 'december': '12'
    };
    
    const parts = dateString.trim().split(/[\s\-/]+/);
    if (parts.length !== 3) return dateString;
    
    const day = parseInt(parts[0].trim(), 10);
    const monthStr = parts[1].trim().toLowerCase();
    const month = months[monthStr];
    const year = parseInt(parts[2].trim(), 10);
    
    if (!month) return dateString;
    
    const paddedDay = day.toString().padStart(2, '0');
    return `${year}-${month}-${paddedDay}`;
  } catch (e) {
    return dateString;
  }
}
