/**
 * ageValidator.js
 * Backend validation for birth dates and age enforcement
 */

/**
 * Validate birth date format (YYYY-MM-DD)
 * @param {string} dateString - Date in ISO format "YYYY-MM-DD"
 * @returns {object} { isValid: boolean, error: string | null }
 */
export function validateBirthDateFormat(dateString) {
  if (!dateString) {
    return { isValid: false, error: 'Birth date is required' };
  }

  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoRegex.test(dateString)) {
    return { isValid: false, error: 'Invalid date format. Expected YYYY-MM-DD' };
  }

  const [year, month, day] = dateString.split('-').map(Number);

  // Validate ranges
  if (month < 1 || month > 12) {
    return { isValid: false, error: `Invalid month: ${month}` };
  }

  if (day < 1 || day > 31) {
    return { isValid: false, error: `Invalid day: ${day}` };
  }

  // Check if date actually exists
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return { isValid: false, error: `Invalid date: ${dateString}` };
  }

  // Validate year range
  const currentYear = new Date().getFullYear();
  if (year > currentYear) {
    return { isValid: false, error: `Birth year cannot be in the future (${year})` };
  }

  if (year < currentYear - 150) {
    return { isValid: false, error: `Birth year must be after ${currentYear - 150} (no one is older than 150)` };
  }

  return { isValid: true, error: null };
}

/**
 * Calculate user age
 * @param {string} dateString - Date in ISO format "YYYY-MM-DD"
 * @returns {number} Age in years
 */
export function calculateAge(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  const birthDate = new Date(year, month - 1, day);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Check if user is 18 or older
 * @param {string} dateString - Date in ISO format "YYYY-MM-DD"
 * @returns {object} { isAdult: boolean, age: number, error: string | null }
 */
export function checkUserAge(dateString) {
  // First validate format
  const formatCheck = validateBirthDateFormat(dateString);
  if (!formatCheck.isValid) {
    return { isAdult: false, age: null, error: formatCheck.error };
  }

  try {
    const age = calculateAge(dateString);
    const isAdult = age >= 18;

    return {
      isAdult,
      age,
      error: !isAdult ? `User must be 18 years or older. User is ${age} years old.` : null
    };
  } catch (err) {
    return { isAdult: false, age: null, error: 'Error calculating age' };
  }
}

/**
 * Comprehensive validation (format + age)
 * @param {string} dateString - Date in ISO format "YYYY-MM-DD"
 * @returns {object} { isValid: boolean, isAdult: boolean, age: number, error: string | null }
 */
export function validateAge(dateString) {
  const formatCheck = validateBirthDateFormat(dateString);
  if (!formatCheck.isValid) {
    return { isValid: false, isAdult: false, age: null, error: formatCheck.error };
  }

  const ageCheck = checkUserAge(dateString);
  return {
    isValid: true,
    isAdult: ageCheck.isAdult,
    age: ageCheck.age,
    error: ageCheck.error
  };
}

export default { validateBirthDateFormat, calculateAge, checkUserAge, validateAge };
