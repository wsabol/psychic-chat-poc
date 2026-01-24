/**
 * Personal Information Service
 * Business logic for user personal information management
 */

import { hashUserId } from '../../shared/hashUtils.js';
import {
  findPersonalInfoByUserId,
  upsertPersonalInfo,
  personalInfoExists,
  updateTrialSessionEmail as updateTrialEmail
} from './repositories/personalInfoRepository.js';
import {
  validatePersonalInfoFields,
  validateBirthDate,
  validateUserAge,
  sanitizeOptionalFields,
  shouldEnqueueBirthChart
} from './validators/personalInfoValidator.js';
import { saveMinimalAstrology, enqueueFullBirthChart, saveFullAstrology } from './astrologyService.js';
import { logErrorFromCatch } from '../../../shared/errorLogger.js';

/**
 * Get user personal information
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Decrypted personal information
 */
export async function getPersonalInfo(userId) {
  return await findPersonalInfoByUserId(userId);
}

/**
 * Update free trial session with email (for temp users)
 * @param {string} userIdHash - Hashed user ID
 * @param {string} email - User email
 * @param {boolean} isTempUser - Whether user is temporary
 * @returns {Promise<void>}
 */
async function updateTrialSessionEmail(userIdHash, email, isTempUser) {
  if (!isTempUser || !email) return;

  try {
    await updateTrialEmail(userIdHash, email);
  } catch (err) {
    logErrorFromCatch('[PERSONAL-INFO-SERVICE] Failed to update free trial email:', err.message);
  }
}

/**
 * Save personal information (main entry point)
 * @param {string} userId - User ID
 * @param {Object} data - Request body data
 * @returns {Promise<Object>} Result { success, error, accountDeleted }
 */
export async function savePersonalInfo(userId, data) {
  const { 
    firstName, lastName, email, birthDate, sex,
    zodiacSign, astrologyData 
  } = data;

  // Validate required fields
  const fieldValidation = validatePersonalInfoFields(data);
  if (!fieldValidation.valid) {
    return { success: false, error: fieldValidation.error };
  }

  // Parse and validate birth date
  const dateValidation = validateBirthDate(birthDate);
  if (!dateValidation.valid) {
    return { success: false, error: dateValidation.error };
  }
  const parsedBirthDate = dateValidation.parsedDate;

  // Validate age
  const ageValidation = await validateUserAge(parsedBirthDate, userId);
  if (!ageValidation.valid) {
    return {
      success: false,
      error: ageValidation.error,
      accountDeleted: ageValidation.accountDeleted
    };
  }

  // Sanitize optional fields
  const sanitizedFields = sanitizeOptionalFields(data);

  // Prepare complete personal info
  const personalInfo = {
    firstName,
    lastName,
    email,
    birthDate: parsedBirthDate,
    sex,
    ...sanitizedFields
  };

  // Save to database
  await upsertPersonalInfo(userId, personalInfo);

  // Verify save succeeded
  const verified = await personalInfoExists(userId);
  if (!verified) {
    return { success: false, error: 'Failed to confirm personal information was saved' };
  }

  const userIdHash = hashUserId(userId);
  const isTempUser = userId.startsWith('temp_');

  // Update trial session email for temp users
  await updateTrialSessionEmail(userIdHash, email, isTempUser);

  // Save minimal astrology (sun sign)
  await saveMinimalAstrology(userIdHash, parsedBirthDate);

  // Enqueue full birth chart calculation if data is available
  if (shouldEnqueueBirthChart(sanitizedFields, parsedBirthDate)) {
    await enqueueFullBirthChart(userId);
  }

  // Save full astrology data if provided
  if (zodiacSign && astrologyData) {
    const astrologyResult = await saveFullAstrology(userIdHash, zodiacSign, astrologyData);
    if (!astrologyResult.success) {
      return astrologyResult;
    }
  }

  return { success: true, message: 'Personal information saved successfully' };
}
