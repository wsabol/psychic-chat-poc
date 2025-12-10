/**
 * dateValidator.js
 * Validates birth dates for format, logical range, and age requirements
 */

/**
 * Validate birth date format (dd-mmm-yyyy)
 * @param {string} dateString - Date in format "dd-mmm-yyyy"
 * @returns {object} { isValid: boolean, error: string | null }
 */
export function validateDateFormat(dateString) {
  if (!dateString) {
    return { isValid: false, error: 'Date is required' };
  }

  const dateRegex = /^(\d{1,2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{4})$/i;
  const match = dateString.trim().match(dateRegex);

  if (!match) {
    return { 
      isValid: false, 
      error: 'Invalid format. Use dd-mmm-yyyy (e.g., 09-Feb-1956)' 
    };
  }

  const day = parseInt(match[1], 10);
  const month = match[2].toLowerCase();
  const year = parseInt(match[3], 10);

  // Validate day range
  if (day < 1 || day > 31) {
    return { isValid: false, error: `Day must be between 1 and 31 (you entered ${day})` };
  }

  // Validate month
  const validMonths = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  if (!validMonths.includes(month)) {
    return { isValid: false, error: `Invalid month: ${match[2]}` };
  }

  // Validate year range (can't be in future or > 120 years old)
  const currentYear = new Date().getFullYear();
  if (year > currentYear) {
    return { isValid: false, error: `Year cannot be in the future (${year})` };
  }

  if (year < currentYear - 150) {
    return { isValid: false, error: `Year must be after ${currentYear - 150} (no one is older than 150)` };
  }

  // Check if date exists in that month
  const monthIndex = validMonths.indexOf(month);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  if (day > daysInMonth) {
    return { 
      isValid: false, 
      error: `${match[2]} only has ${daysInMonth} days (you entered ${day})` 
    };
  }

  return { isValid: true, error: null };
}

/**
 * Check if user is 18 or older
 * @param {string} dateString - Date in format "dd-mmm-yyyy"
 * @returns {object} { isAdult: boolean, age: number, error: string | null }
 */
export function checkAge(dateString) {
  // First validate format
  const formatCheck = validateDateFormat(dateString);
  if (!formatCheck.isValid) {
    return { isAdult: false, age: null, error: formatCheck.error };
  }

  try {
    const months = {
      'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
      'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
    };

    const parts = dateString.trim().split('-');
    const day = parseInt(parts[0], 10);
    const month = months[parts[1].toLowerCase()];
    const year = parseInt(parts[2], 10);

    const birthDate = new Date(year, month, day);
    const today = new Date();

    // Calculate age
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    const isAdult = age >= 18;

    return {
      isAdult,
      age,
      error: !isAdult ? `You must be 18 years or older to use this service. You are ${age} years old.` : null
    };
  } catch (err) {
    return { isAdult: false, age: null, error: 'Error calculating age' };
  }
}

/**
 * Comprehensive validation (format + age)
 * @param {string} dateString - Date in format "dd-mmm-yyyy"
 * @returns {object} { isValid: boolean, isAdult: boolean, age: number, error: string | null }
 */
export function validateBirthDate(dateString) {
  const formatCheck = validateDateFormat(dateString);
  if (!formatCheck.isValid) {
    return { isValid: false, isAdult: false, age: null, error: formatCheck.error };
  }

  const ageCheck = checkAge(dateString);
  return {
    isValid: true,
    isAdult: ageCheck.isAdult,
    age: ageCheck.age,
    error: ageCheck.error
  };
}

export default { validateDateFormat, checkAge, validateBirthDate };
