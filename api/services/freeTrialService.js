/**
 * Free Trial Service
 * Single source of truth for all free trial business logic — session management,
 * personal info, astrology, and orchestration.
 *
 * Sections:
 *   1. Input Sanitization
 *   2. Session Management    — create / resume / update / complete / fetch
 *   3. Personal Info         — Database Operations
 *   4. Session Email         — Database Operations
 *   5. Astrology             — Database Operations (private helpers + exports)
 *   6. External Services     — Birth Chart via Lambda
 *   7. Zodiac Sign Resolution
 *   8. Orchestration
 *
 * Note: extractClientIp has been consolidated into shared/ipUtils.js — import
 * from there rather than from this service.
 */

import crypto from 'crypto';
import { db } from '../shared/db.js';
import { hashUserId, hashTempUserId, hashIpAddress } from '../shared/hashUtils.js';
import { calculateSunSignFromDate } from '../shared/zodiacUtils.js';
import { logErrorFromCatch } from '../shared/errorLogger.js';

// ─── 1. INPUT SANITIZATION ────────────────────────────────────────────────────

/**
 * Sanitize and apply defaults to personal info fields.
 * @param {Object} data - Raw input data
 * @returns {Object} Sanitized data with defaults applied
 */
export function sanitizePersonalInfo(data) {
  const {
    firstName,
    lastName,
    email,
    birthDate,
    birthTime,
    birthCountry,
    birthProvince,
    birthCity,
    birthTimezone,
    sex,
    addressPreference
  } = data;

  // Return the original value only when it exists and is non-empty after trimming
  const safeStr = (val) => (val && val.trim() ? val : null);

  return {
    firstName:         firstName || 'Seeker',
    lastName:          lastName  || 'Soul',
    email,
    birthDate,
    birthTime:         safeStr(birthTime),
    birthCountry:      safeStr(birthCountry),
    birthProvince:     safeStr(birthProvince),
    birthCity:         safeStr(birthCity),
    birthTimezone:     safeStr(birthTimezone),
    sex:               sex || 'Unspecified',
    addressPreference: safeStr(addressPreference),
  };
}

// ─── 2. SESSION MANAGEMENT ───────────────────────────────────────────────────

/**
 * Determine whether a new free trial session should be created, resumed, blocked,
 * or reset.  This is the access-control layer for session creation — all policy
 * lives here so `createFreeTrialSession` stays readable.
 *
 * Possible actions:
 *   'create'  — no prior session exists; proceed to insert a new row.
 *   'resume'  — same user (or non-whitelisted different-IP user) already has a session.
 *   'block'   — a DIFFERENT user already started a trial from this IP (the exploit case).
 *   'reset'   — whitelisted tester whose previous session is completed; wipe and restart.
 *
 * @param {string} ipHash     - Hashed IP address
 * @param {string} userIdHash - Hashed user ID
 * @returns {Promise<{ action: 'create'|'resume'|'block'|'reset', session?: Object }>}
 */
async function checkSessionAccess(ipHash, userIdHash) {
  // Whitelisted IPs get unlimited trials (testers / QA)
  const { rows: wlRows } = await db.query(
    'SELECT id FROM free_trial_whitelist WHERE ip_address_hash = $1',
    [ipHash]
  );
  const isWhitelisted = wlRows.length > 0;

  // Check if this IP already has any session (completed or in-progress)
  const { rows: ipRows } = await db.query(
    `SELECT id, current_step, is_completed, user_id_hash, started_at
     FROM free_trial_sessions
     WHERE ip_address_hash = $1
     ORDER BY started_at DESC
     LIMIT 1`,
    [ipHash]
  );

  if (ipRows.length > 0 && !isWhitelisted) {
    const session = ipRows[0];
    // Same user resuming their own session — allow
    if (session.user_id_hash === userIdHash) return { action: 'resume', session };
    // Different user on the same IP — block the exploit
    return { action: 'block' };
  }

  // Check if this specific user already has a session (e.g. after a VPN / IP change)
  const { rows: userRows } = await db.query(
    `SELECT id, current_step, is_completed
     FROM free_trial_sessions
     WHERE user_id_hash = $1
     LIMIT 1`,
    [userIdHash]
  );

  if (userRows.length > 0) {
    const session = userRows[0];
    // Whitelisted tester with a completed session → reset so they can rerun the flow
    if (isWhitelisted && session.is_completed) return { action: 'reset', session };
    return { action: 'resume', session };
  }

  return { action: 'create' };
}

/**
 * Write placeholder `user_personal_info` and `user_preferences` rows so the chat
 * handler always finds the user in the DB before they fill in their profile.
 * Throws on failure — callers should surface the error (chat won't work without this).
 *
 * @param {string} tempUserId - Raw temporary user ID
 * @param {string} userIdHash - Hashed user ID
 * @param {string} [language='en-US'] - Language selected on the landing screen
 * @returns {Promise<void>}
 */
async function initializeUserScaffold(tempUserId, userIdHash, language = 'en-US') {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('[FREE-TRIAL-SERVICE] ENCRYPTION_KEY is not set — cannot initialize user scaffold');
  }

  await db.query(
    `INSERT INTO user_personal_info
     (user_id, email_encrypted, first_name_encrypted, last_name_encrypted,
      birth_date_encrypted, birth_time_encrypted, birth_country_encrypted,
      birth_province_encrypted, birth_city_encrypted, birth_timezone_encrypted,
      sex_encrypted, familiar_name_encrypted, created_at, updated_at)
     VALUES ($1, pgp_sym_encrypt($2, $5), pgp_sym_encrypt($3, $5), pgp_sym_encrypt($4, $5),
             NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NOW(), NOW())
     ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()`,
    [tempUserId, `${tempUserId}@psychic.local`, 'Seeker', 'Soul', key]
  );

  // CRITICAL: also seed user_preferences so oracle greeting and timezone queries work.
  // Store the language the user selected on the landing screen so the oracle greets
  // them and responds in that language from the very first message.
  await db.query(
    `INSERT INTO user_preferences
     (user_id_hash, language, oracle_language, timezone, response_type, created_at, updated_at)
     VALUES ($1, $2, $2, 'UTC', 'full', NOW(), NOW())
     ON CONFLICT (user_id_hash) DO UPDATE SET
       language        = EXCLUDED.language,
       oracle_language = EXCLUDED.oracle_language,
       updated_at      = NOW()`,
    [userIdHash, language]
  );
}

/**
 * Create (or resume) a free trial session for a temporary user.
 *
 * Access-control rules (enforced via `checkSessionAccess`):
 *  - Whitelisted IPs may create unlimited sessions (testers / QA).
 *  - A non-whitelisted IP that already has any session is blocked unless the
 *    same user is resuming their own session.
 *  - A user with an existing session on a different IP is allowed to resume.
 *
 * On first creation, placeholder `user_personal_info` and `user_preferences`
 * rows are also written so the chat layer always finds the user in the DB.
 *
 * @param {string} tempUserId          - Temporary user ID
 * @param {string} ipAddress           - Client IP address
 * @param {string} [language='en-US']  - Language selected on the landing screen
 * @returns {Promise<Object>} Session data or error descriptor
 */
export async function createFreeTrialSession(tempUserId, ipAddress, language = 'en-US') {
  if (!tempUserId || !ipAddress) {
    return { success: false, error: 'Missing required parameters' };
  }

  try {
    const ipHash     = hashIpAddress(ipAddress);
    const userIdHash = hashTempUserId(tempUserId);

    const { action, session } = await checkSessionAccess(ipHash, userIdHash);

    if (action === 'block') {
      return {
        success:       false,
        error:         'This device has already started a free trial',
        alreadyStarted: true,
      };
    }

    if (action === 'resume') {
      // Upsert user_preferences so the row always exists with the correct language.
      // A plain UPDATE is a silent no-op when the row doesn't yet exist (e.g. the
      // initial scaffold failed or was cleaned up), so use INSERT … ON CONFLICT instead.
      await db.query(
        `INSERT INTO user_preferences
         (user_id_hash, language, oracle_language, timezone, response_type, created_at, updated_at)
         VALUES ($1, $2, $2, 'UTC', 'full', NOW(), NOW())
         ON CONFLICT (user_id_hash) DO UPDATE SET
           language        = EXCLUDED.language,
           oracle_language = EXCLUDED.oracle_language,
           updated_at      = NOW()`,
        [userIdHash, language]
      );
      return {
        success:     true,
        sessionId:   session.id,
        currentStep: session.current_step,
        isCompleted: session.is_completed,
        resuming:    true,
        message:     session.is_completed
          ? 'Trial already completed'
          : `Resuming from step: ${session.current_step}`,
      };
    }

    if (action === 'reset') {
      const { rows } = await db.query(
        `UPDATE free_trial_sessions
         SET current_step          = 'created',
             is_completed          = false,
             completed_at          = NULL,
             started_at            = NOW(),
             last_activity_at      = NOW(),
             ip_address_hash       = $2,
             ip_address_encrypted  = pgp_sym_encrypt($3, $4)
         WHERE user_id_hash = $1
         RETURNING id, current_step, started_at`,
        [userIdHash, ipHash, ipAddress, process.env.ENCRYPTION_KEY]
      );

      // Upsert user_preferences so the language is always correct (UPDATE is a
      // silent no-op when the row doesn't exist, so use INSERT … ON CONFLICT instead).
      await db.query(
        `INSERT INTO user_preferences
         (user_id_hash, language, oracle_language, timezone, response_type, created_at, updated_at)
         VALUES ($1, $2, $2, 'UTC', 'full', NOW(), NOW())
         ON CONFLICT (user_id_hash) DO UPDATE SET
           language        = EXCLUDED.language,
           oracle_language = EXCLUDED.oracle_language,
           updated_at      = NOW()`,
        [userIdHash, language]
      );

      // CRITICAL: Wipe all stale horoscope/astrology messages AND the astrology
      // profile so the tester gets a completely clean slate on each new run.
      // Without this, the old cached horoscope would be served instead of a fresh
      // one, and the zodiac picker would be skipped because old astrology data exists.
      await clearAstrologyMessages(userIdHash);
      try {
        await db.query(
          `DELETE FROM user_astrology WHERE user_id_hash = $1`,
          [userIdHash]
        );
      } catch (err) {
        // Non-fatal — log and continue
        logErrorFromCatch(err, 'free-trial', '[FREE-TRIAL-SERVICE] Failed to clear user_astrology on reset');
      }

      return {
        success:     true,
        sessionId:   rows[0].id,
        currentStep: rows[0].current_step,
        startedAt:   rows[0].started_at,
        resuming:    false,
        message:     'Session reset for whitelisted tester',
      };
    }

    // action === 'create' — brand-new session
    const sessionId = crypto.randomUUID();

    const { rows } = await db.query(
      `INSERT INTO free_trial_sessions
       (id, ip_address_hash, ip_address_encrypted, user_id_hash, current_step, is_completed, started_at, last_activity_at)
       VALUES ($1, $2, pgp_sym_encrypt($3, $7), $4, $5, $6, NOW(), NOW())
       RETURNING id, current_step, started_at`,
      [sessionId, ipHash, ipAddress, userIdHash, 'created', false, process.env.ENCRYPTION_KEY]
    );

    // Scaffold placeholder DB rows so the chat handler works immediately.
    // Pass the landing-screen language so oracle_language is set correctly from the start.
    await initializeUserScaffold(tempUserId, userIdHash, language);

    return {
      success:     true,
      sessionId:   rows[0].id,
      currentStep: rows[0].current_step,
      startedAt:   rows[0].started_at,
    };
  } catch (err) {
    // Duplicate-key errors are expected under race conditions — suppress them
    if (!err.message?.includes('duplicate key')) {
      logErrorFromCatch(err, 'free-trial', '[FREE-TRIAL-SERVICE] Error creating session');
    }
    return { success: false, error: 'Unable to create session' };
  }
}

/**
 * Advance (or set) the current step for a free trial session.
 * Setting the step to 'completed' or 'horoscope' also marks the session as done.
 *
 * @param {string} tempUserId - Temporary user ID
 * @param {string} newStep    - 'chat' | 'personal_info' | 'horoscope' | 'completed'
 * @returns {Promise<Object>} Updated session data or error descriptor
 */
export async function updateFreeTrialStep(tempUserId, newStep) {
  if (!tempUserId || !newStep) {
    return { success: false, error: 'Missing required parameters' };
  }

  try {
    const userIdHash  = hashTempUserId(tempUserId);
    const isCompleted = newStep === 'completed' || newStep === 'horoscope';

    const { rows } = await db.query(
      `UPDATE free_trial_sessions
       SET current_step    = $1,
           is_completed    = $2,
           completed_at    = CASE WHEN $2 = true THEN NOW() ELSE completed_at END,
           last_activity_at = NOW()
       WHERE user_id_hash = $3
       RETURNING id, current_step, is_completed, completed_at, last_activity_at`,
      [newStep, isCompleted, userIdHash]
    );

    if (rows.length === 0) return { success: false, error: 'Session not found' };

    return {
      success:        true,
      sessionId:      rows[0].id,
      currentStep:    rows[0].current_step,
      isCompleted:    rows[0].is_completed,
      completedAt:    rows[0].completed_at,
      lastActivityAt: rows[0].last_activity_at,
    };
  } catch (err) {
    logErrorFromCatch(err, 'free-trial', '[FREE-TRIAL-SERVICE] Error updating step');
    return { success: false, error: 'Unable to update progress' };
  }
}

/**
 * Mark a free trial session as completed.
 * Thin semantic wrapper around `updateFreeTrialStep` for call-site clarity.
 *
 * @param {string} tempUserId - Temporary user ID
 * @returns {Promise<Object>} Completion data or error descriptor
 */
export async function completeFreeTrialSession(tempUserId) {
  if (!tempUserId) return { success: false, error: 'Missing required parameters' };
  return updateFreeTrialStep(tempUserId, 'completed');
}

/**
 * Fetch the current free trial session for a user.
 *
 * @param {string} tempUserId - Temporary user ID
 * @returns {Promise<Object>} Session data or error descriptor
 */
export async function getFreeTrialSession(tempUserId) {
  if (!tempUserId) return { success: false, error: 'Missing required parameters' };

  try {
    const userIdHash = hashTempUserId(tempUserId);

    const { rows } = await db.query(
      `SELECT id, current_step, is_completed, started_at, completed_at, last_activity_at
       FROM free_trial_sessions
       WHERE user_id_hash = $1`,
      [userIdHash]
    );

    if (rows.length === 0) return { success: false, error: 'Session not found', notFound: true };

    return {
      success:        true,
      sessionId:      rows[0].id,
      currentStep:    rows[0].current_step,
      isCompleted:    rows[0].is_completed,
      startedAt:      rows[0].started_at,
      completedAt:    rows[0].completed_at,
      lastActivityAt: rows[0].last_activity_at,
    };
  } catch (err) {
    logErrorFromCatch(err, 'free-trial', '[FREE-TRIAL-SERVICE] Error retrieving session');
    return { success: false, error: 'Unable to retrieve session' };
  }
}

// ─── 3. PERSONAL INFO — DATABASE OPERATIONS ──────────────────────────────────

/**
 * Save personal information to the database (encrypted).
 * @param {string} tempUserId  - Temporary user ID
 * @param {Object} personalInfo - Sanitized personal information
 * @returns {Promise<void>}
 * @throws {Error} If the database write fails
 */
export async function savePersonalInfo(tempUserId, personalInfo) {
  const {
    firstName,
    lastName,
    email,
    birthDate,
    birthTime,
    birthCountry,
    birthProvince,
    birthCity,
    birthTimezone,
    sex,
    addressPreference
  } = personalInfo;

  try {
    await db.query(
      `INSERT INTO user_personal_info 
       (user_id, first_name_encrypted, last_name_encrypted, email_encrypted, 
        birth_date_encrypted, birth_time_encrypted, birth_country_encrypted, 
        birth_province_encrypted, birth_city_encrypted, birth_timezone_encrypted, 
        sex_encrypted, familiar_name_encrypted)
       VALUES ($2, pgp_sym_encrypt($3, $1), pgp_sym_encrypt($4, $1), 
               pgp_sym_encrypt($5, $1), pgp_sym_encrypt($6, $1), 
               pgp_sym_encrypt($7, $1), pgp_sym_encrypt($8, $1), 
               pgp_sym_encrypt($9, $1), pgp_sym_encrypt($10, $1), 
               pgp_sym_encrypt($11, $1), pgp_sym_encrypt($12, $1), 
               pgp_sym_encrypt($13, $1))
       ON CONFLICT (user_id) DO UPDATE SET
         first_name_encrypted      = EXCLUDED.first_name_encrypted,
         last_name_encrypted       = EXCLUDED.last_name_encrypted,
         email_encrypted           = EXCLUDED.email_encrypted,
         birth_date_encrypted      = EXCLUDED.birth_date_encrypted,
         birth_time_encrypted      = EXCLUDED.birth_time_encrypted,
         birth_country_encrypted   = EXCLUDED.birth_country_encrypted,
         birth_province_encrypted  = EXCLUDED.birth_province_encrypted,
         birth_city_encrypted      = EXCLUDED.birth_city_encrypted,
         birth_timezone_encrypted  = EXCLUDED.birth_timezone_encrypted,
         sex_encrypted             = EXCLUDED.sex_encrypted,
         familiar_name_encrypted   = EXCLUDED.familiar_name_encrypted,
         updated_at                = CURRENT_TIMESTAMP`,
      [
        process.env.ENCRYPTION_KEY,
        tempUserId,
        firstName,
        lastName,
        email,
        birthDate,
        birthTime,
        birthCountry,
        birthProvince,
        birthCity,
        birthTimezone,
        sex,
        addressPreference
      ]
    );
  } catch (err) {
    logErrorFromCatch('[FREE-TRIAL-SERVICE] ✗ Database error saving personal info:', {
      error: err.message,
      code:   err.code,
      detail: err.detail,
      stack:  err.stack
    });
    throw new Error(`Failed to save personal information to database: ${err.message}`);
  }
}

/**
 * Verify personal information was saved successfully.
 * @param {string} tempUserId - Temporary user ID
 * @returns {Promise<boolean>} True if a record exists
 */
export async function verifyPersonalInfoSaved(tempUserId) {
  const { rows } = await db.query(
    `SELECT user_id FROM user_personal_info WHERE user_id = $1`,
    [tempUserId]
  );
  return rows.length > 0;
}

// ─── 4. SESSION EMAIL — DATABASE OPERATIONS ──────────────────────────────────

/**
 * Update the free trial session row with the user's encrypted email.
 * Non-fatal: errors are logged but do not interrupt the caller.
 * @param {string} userIdHash - Hashed user ID
 * @param {string} email      - User email
 * @returns {Promise<void>}
 */
export async function updateTrialSessionEmail(userIdHash, email) {
  if (!email) return;

  try {
    await db.query(
      `UPDATE free_trial_sessions 
       SET email_encrypted = pgp_sym_encrypt($1, $2)
       WHERE user_id_hash = $3`,
      [email, process.env.ENCRYPTION_KEY, userIdHash]
    );
  } catch (err) {
    // Non-fatal — log and continue
    logErrorFromCatch('[FREE-TRIAL-SERVICE] Failed to update trial session email:', err.message);
  }
}

// ─── 5. ASTROLOGY — DATABASE OPERATIONS ──────────────────────────────────────

/**
 * Upsert a row in user_astrology.
 * Private helper — all astrology writes in this service funnel through here
 * so the SQL is defined exactly once.
 * @param {string} userIdHash    - Hashed user ID
 * @param {string} zodiacSign    - Sun sign
 * @param {Object} astrologyData - Astrology data object
 * @returns {Promise<void>}
 */
async function upsertUserAstrology(userIdHash, zodiacSign, astrologyData) {
  await db.query(
    `INSERT INTO user_astrology (user_id_hash, zodiac_sign, astrology_data)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id_hash) DO UPDATE SET
       zodiac_sign    = EXCLUDED.zodiac_sign,
       astrology_data = EXCLUDED.astrology_data,
       updated_at     = CURRENT_TIMESTAMP`,
    [userIdHash, zodiacSign, JSON.stringify(astrologyData)]
  );
}

/**
 * Build a minimal astrology data object for a known sun sign only.
 * Used when we have a sign but no full chart (e.g. no birth location data,
 * or the user picked their sign manually).
 * @param {string} sunSign
 * @returns {Object}
 */
function buildMinimalAstrologyData(sunSign) {
  return {
    sun_sign:      sunSign,
    sun_degree:    0,
    moon_sign:     null,
    moon_degree:   null,
    rising_sign:   null,
    rising_degree: null,
    calculated_at: new Date().toISOString(),
  };
}

/**
 * Save only the sun sign when full location data is unavailable.
 * Non-fatal: errors are logged but do not interrupt the caller.
 * @param {string} userIdHash - Hashed user ID
 * @param {string} birthDate  - Birth date in YYYY-MM-DD format
 * @returns {Promise<void>}
 */
export async function saveMinimalAstrology(userIdHash, birthDate) {
  try {
    const sunSign = calculateSunSignFromDate(birthDate);
    if (!sunSign) return;

    await upsertUserAstrology(userIdHash, sunSign, buildMinimalAstrologyData(sunSign));
  } catch (err) {
    // Non-fatal — continue anyway
    logErrorFromCatch('[FREE-TRIAL-SERVICE] Failed to save minimal astrology:', err.message);
  }
}

/**
 * Persist full astrology data returned from an external calculation.
 * No-op when either argument is falsy.
 * @param {string} userIdHash    - Hashed user ID
 * @param {string} zodiacSign    - Zodiac (sun) sign
 * @param {Object} astrologyData - Full astrology result object
 * @returns {Promise<void>}
 */
export async function saveFullAstrologyData(userIdHash, zodiacSign, astrologyData) {
  if (!zodiacSign || !astrologyData) return;
  await upsertUserAstrology(userIdHash, zodiacSign, astrologyData);
}

/**
 * Delete stale astrology-category messages so the next request regenerates them.
 * Non-fatal: errors are logged but do not interrupt the caller.
 * @param {string} userIdHash - Hashed user ID
 * @returns {Promise<void>}
 */
export async function clearAstrologyMessages(userIdHash) {
  try {
    await db.query(
      `DELETE FROM messages 
       WHERE user_id_hash = $1 
       AND role IN ('horoscope', 'moon_phase', 'cosmic_weather', 'void_of_course', 'lunar_nodes')`,
      [userIdHash]
    );
  } catch (err) {
    // Non-fatal
    logErrorFromCatch('[FREE-TRIAL-SERVICE] Failed to clear astrology messages:', err.message);
  }
}

// ─── 6. EXTERNAL SERVICES — BIRTH CHART VIA LAMBDA ───────────────────────────

/**
 * Call the Lambda to compute a full birth chart and persist the result.
 *
 * Birth time is optional — defaults to noon (12:00:00) when not supplied.
 * Moon sign estimated at noon is usually reliable (~2–3 days per sign).
 * Rising sign WITHOUT birth time is NOT reliable (changes every ~2 hours).
 *
 * Requires at minimum: birthCity + birthProvince + birthCountry + birthDate.
 * Non-fatal: errors are logged but do not interrupt the caller.
 *
 * Previously named enqueueFullBirthChartCalculation — renamed to accurately
 * reflect that the Lambda is called synchronously (nothing is queued).
 *
 * @param {string} tempUserId   - Temporary user ID
 * @param {Object} personalInfo - Personal information object
 * @returns {Promise<void>}
 */
export async function calculateAndSaveFullBirthChart(tempUserId, personalInfo) {
  const { birthTime, birthCountry, birthProvince, birthCity, birthDate, birthTimezone } = personalInfo;

  // Require at least city + province + country + date for a meaningful calculation
  if (!birthCountry || !birthProvince || !birthCity || !birthDate) return;

  try {
    // Small delay to ensure preceding DB writes are fully propagated
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { calculateBirthChart } = await import('./lambda-astrology.js');

    const result = await calculateBirthChart({
      birth_date:     birthDate,
      birth_time:     birthTime || '12:00:00', // Default to noon when absent
      birth_country:  birthCountry,
      birth_province: birthProvince,
      birth_city:     birthCity,
      birth_timezone: birthTimezone,
    });

    if (result.success) {
      const userIdHash = hashUserId(tempUserId);
      const zodiacSign = result.sun_sign || calculateSunSignFromDate(birthDate);
      await upsertUserAstrology(userIdHash, zodiacSign, result);

      // NOTE: Free trial users get insights on-demand only (generated once when requested).
      // They do NOT receive daily regeneration — insights persist for their entire trial.
    } else {
      console.error('[FREE-TRIAL-SERVICE] Birth chart calculation failed:', result.error);
    }
  } catch (err) {
    // Non-fatal
    logErrorFromCatch('[FREE-TRIAL-SERVICE] Failed to calculate birth chart:', err.message);
  }
}

// ─── 7. ZODIAC SIGN RESOLUTION ───────────────────────────────────────────────

/**
 * Midpoint birth dates for each zodiac sign.
 * Used to generate a synthetic birth date when a user picks their sign manually
 * (without entering actual birth info). Year 2000 is arbitrary — only month/day matters.
 * Each date falls squarely in the middle of its sign's range.
 */
export const SIGN_MIDPOINT_DATES = {
  aries:       '2000-04-05',
  taurus:      '2000-05-05',
  gemini:      '2000-06-05',
  cancer:      '2000-07-07',
  leo:         '2000-08-07',
  virgo:       '2000-09-07',
  libra:       '2000-10-07',
  scorpio:     '2000-11-07',
  sagittarius: '2000-12-07',
  capricorn:   '2000-01-05',
  aquarius:    '2000-02-08',
  pisces:      '2000-03-05',
};

/**
 * Persist a sign chosen via the sign-picker UI.
 *
 * Writes a minimal astrology record to user_astrology AND a synthetic birth date
 * to user_personal_info so that the horoscope pipeline always finds a birth date.
 * The synthetic birth date write is non-fatal — errors are logged but not re-thrown.
 *
 * @param {string} userIdHash - Hashed user ID
 * @param {string} zodiacSign - Lowercased zodiac sign name
 * @param {string} tempUserId - Raw temp user ID (needed for user_personal_info update)
 * @returns {Promise<void>}
 */
export async function persistPickedZodiacSign(userIdHash, zodiacSign, tempUserId) {
  await upsertUserAstrology(userIdHash, zodiacSign, buildMinimalAstrologyData(zodiacSign));

  const syntheticBirthDate = SIGN_MIDPOINT_DATES[zodiacSign];
  if (!syntheticBirthDate) return;

  try {
    await db.query(
      `UPDATE user_personal_info
       SET birth_date_encrypted = pgp_sym_encrypt($1, $2),
           updated_at = NOW()
       WHERE user_id = $3`,
      [syntheticBirthDate, process.env.ENCRYPTION_KEY, tempUserId]
    );
  } catch (err) {
    // Non-fatal — astrology data alone may still be sufficient for horoscope generation
    logErrorFromCatch('[FREE-TRIAL-SERVICE] Failed to save synthetic birth date:', err.message);
  }
}

/**
 * Resolve the zodiac sign for a free trial user, trying progressively weaker sources:
 *   1. Stored row in user_astrology (preferred — already calculated/persisted)
 *   2. Calculated from the stored birth date in user_personal_info
 *   3. Client-supplied `signParam` (sign-picker fallback) — persisted for future calls
 *
 * Also extracts full chart data (moon / rising signs) when available.
 *
 * @param {string}      userIdHash - Hashed user ID
 * @param {string}      tempUserId - Raw temp user ID (for user_personal_info lookup)
 * @param {string|null} signParam  - Sign provided by the client as a last resort
 * @returns {Promise<{ zodiacSign: string|null, chartData: Object|null }>}
 */
export async function resolveZodiacSignForTrial(userIdHash, tempUserId, signParam) {
  let zodiacSign = null;
  let chartData  = null;

  // 1. Prefer stored astrology data
  const { rows: astrologyRows } = await db.query(
    `SELECT zodiac_sign, astrology_data FROM user_astrology WHERE user_id_hash = $1`,
    [userIdHash]
  );
  if (astrologyRows.length > 0) {
    zodiacSign = astrologyRows[0].zodiac_sign || null;

    if (astrologyRows[0].astrology_data) {
      const ad =
        typeof astrologyRows[0].astrology_data === 'string'
          ? JSON.parse(astrologyRows[0].astrology_data)
          : astrologyRows[0].astrology_data;

      // Only surface chart data when we have more than just a sun sign
      if (ad && (ad.moon_sign || ad.rising_sign)) {
        chartData = {
          sunSign:    ad.sun_sign || zodiacSign,
          moonSign:   ad.moon_sign   || null,
          risingSign: ad.rising_sign || null,
        };
      }
    } else if (zodiacSign) {
      // Row exists but astrology_data is null — fill it in now so the horoscope
      // handler never hits the "incomplete birth chart" guard.
      try {
        await upsertUserAstrology(userIdHash, zodiacSign, buildMinimalAstrologyData(zodiacSign));
      } catch (fillErr) {
        logErrorFromCatch(fillErr, 'free-trial', '[resolveZodiacSignForTrial] Failed to backfill astrology_data');
      }
    }
  }

  // 2. Fallback: calculate from the stored birth date
  // Use CASE to guard against NULL birth_date_encrypted — pgp_sym_decrypt on a NULL
  // bytea can throw "Wrong key or corrupt data" on some pgcrypto builds, so we only
  // decrypt when the column is actually non-NULL.
  if (!zodiacSign) {
    try {
      const { rows: piRows } = await db.query(
        `SELECT CASE WHEN birth_date_encrypted IS NOT NULL
                     THEN pgp_sym_decrypt(birth_date_encrypted, $1)::text
                     ELSE NULL
                END AS birth_date
         FROM user_personal_info WHERE user_id = $2`,
        [process.env.ENCRYPTION_KEY, tempUserId]
      );
      if (piRows.length > 0 && piRows[0].birth_date && piRows[0].birth_date !== 'null') {
        zodiacSign = calculateSunSignFromDate(piRows[0].birth_date);
        // Persist to user_astrology so the horoscope handler always finds astrology_data.
        if (zodiacSign) {
          try {
            await upsertUserAstrology(userIdHash, zodiacSign, buildMinimalAstrologyData(zodiacSign));
          } catch (writeErr) {
            logErrorFromCatch(writeErr, 'free-trial', '[resolveZodiacSignForTrial] Failed to persist birth-date-derived astrology');
          }
        }
      }
    } catch (bdErr) {
      // Non-fatal — log and continue to the next fallback (sign-picker param)
      logErrorFromCatch(bdErr, 'free-trial', '[resolveZodiacSignForTrial] Failed to decrypt birth date; falling through to signParam');
    }
  }

  // 3. Final fallback: client-supplied sign (sign-picker UI). Persisted so
  //    subsequent calls (e.g. the horoscope generator) can find the sign in the DB.
  if (!zodiacSign && signParam) {
    zodiacSign = String(signParam).toLowerCase();
    await persistPickedZodiacSign(userIdHash, zodiacSign, tempUserId);
  }

  return { zodiacSign, chartData };
}

// ─── 8. LANGUAGE PREFERENCE ──────────────────────────────────────────────────

/**
 * Refresh `language` and `oracle_language` in `user_preferences` for a free
 * trial user.  Called by the horoscope endpoint so that if the user changed
 * their language AFTER session creation, the oracle still responds in the
 * correct language instead of falling back to the creation-time value.
 *
 * Non-fatal: errors are logged but do not interrupt the caller.
 *
 * @param {string} userIdHash - Hashed user ID
 * @param {string} language   - BCP-47 language code (e.g. 'pt-BR')
 * @returns {Promise<void>}
 */
export async function refreshLanguagePreference(userIdHash, language) {
  if (!userIdHash || !language) return;
  try {
    await db.query(
      `INSERT INTO user_preferences
       (user_id_hash, language, oracle_language, timezone, response_type, created_at, updated_at)
       VALUES ($1, $2, $2, 'UTC', 'full', NOW(), NOW())
       ON CONFLICT (user_id_hash) DO UPDATE SET
         language        = EXCLUDED.language,
         oracle_language = EXCLUDED.oracle_language,
         updated_at      = NOW()`,
      [userIdHash, language]
    );
  } catch (err) {
    logErrorFromCatch(err, 'free-trial', '[FREE-TRIAL-SERVICE] Failed to refresh language preference');
  }
}

// ─── 9. ORCHESTRATION ────────────────────────────────────────────────────────

/**
 * Orchestrate the complete personal info save process.
 *
 * Steps (in order):
 *   1. Save personal information to the database
 *   2. Verify the save succeeded
 *   3. Update trial session with email
 *   4. Save minimal astrology (sun sign only) when location data is absent
 *   5. Clear stale astrology messages
 *   6. Calculate and save a full birth chart when location data is present
 *   7. Persist any astrology data provided directly by the caller
 *
 * @param {string}      tempUserId    - Temporary user ID
 * @param {Object}      personalInfo  - Sanitized personal information
 * @param {string}      [zodiacSign]  - Optional zodiac sign (caller-supplied)
 * @param {Object}      [astrologyData] - Optional full astrology data (caller-supplied)
 * @returns {Promise<{ success: boolean, message?: string, error?: string }>}
 */
export async function processPersonalInfoSave(tempUserId, personalInfo, zodiacSign, astrologyData) {
  const userIdHash = hashUserId(tempUserId);

  // 1. Save personal information
  await savePersonalInfo(tempUserId, personalInfo);

  // 2. Verify save succeeded
  const verified = await verifyPersonalInfoSaved(tempUserId);
  if (!verified) {
    return { success: false, error: 'Failed to confirm personal information was saved' };
  }

  // 3. Update trial session with email
  await updateTrialSessionEmail(userIdHash, personalInfo.email);

  // 4. Decide astrology write strategy based on available location data.
  //    Birth time is no longer required — the Lambda defaults to noon when absent.
  const { birthCountry, birthProvince, birthCity, birthDate } = personalInfo;
  const hasLocationData = !!(birthCountry && birthProvince && birthCity && birthDate);

  // Save sun-sign-only astrology when we lack location data.
  // Skip this when location data IS present so the upcoming full calculation
  // doesn't race with a partial write.
  if (!hasLocationData) {
    await saveMinimalAstrology(userIdHash, personalInfo.birthDate);
  }

  // 5. Clear stale astrology messages
  await clearAstrologyMessages(userIdHash);

  // 6. Trigger full birth chart calculation (awaited synchronously to guarantee
  //    data is written before the API response returns).
  if (hasLocationData) {
    await calculateAndSaveFullBirthChart(tempUserId, personalInfo);
  }

  // 7. Persist any astrology data provided directly by the caller
  await saveFullAstrologyData(userIdHash, zodiacSign, astrologyData);

  return { success: true, message: 'Personal information saved successfully' };
}

export default {
  // § 2 — Session Management
  createFreeTrialSession,
  updateFreeTrialStep,
  completeFreeTrialSession,
  getFreeTrialSession,
  // § 1 — Input Sanitization
  sanitizePersonalInfo,
  // § 3 — Personal Info
  savePersonalInfo,
  verifyPersonalInfoSaved,
  // § 4 — Session Email
  updateTrialSessionEmail,
  // § 5 — Astrology
  saveMinimalAstrology,
  saveFullAstrologyData,
  clearAstrologyMessages,
  // § 6 — External Services
  calculateAndSaveFullBirthChart,
  // § 7 — Zodiac Sign Resolution
  SIGN_MIDPOINT_DATES,
  persistPickedZodiacSign,
  resolveZodiacSignForTrial,
  // § 8 — Language Preference
  refreshLanguagePreference,
  // § 9 — Orchestration
  processPersonalInfoSave,
};
