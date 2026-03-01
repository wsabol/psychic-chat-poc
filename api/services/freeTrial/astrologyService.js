/**
 * Free Trial — Astrology Service
 * Handles all astrology DB operations, birth chart calculation via Lambda,
 * and zodiac sign resolution.
 *
 * Sections:
 *   1. Private Helpers    — upsertUserAstrology, buildMinimalAstrologyData
 *   2. Astrology DB Ops   — saveMinimalAstrology, saveFullAstrologyData, clearAstrologyMessages
 *   3. Birth Chart Lambda — calculateAndSaveFullBirthChart
 *   4. Zodiac Resolution  — SIGN_MIDPOINT_DATES, persistPickedZodiacSign, resolveZodiacSignForTrial
 */

import { db } from '../../shared/db.js';
import { hashUserId } from '../../shared/hashUtils.js';
import { calculateSunSignFromDate } from '../../shared/zodiacUtils.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';

// ─── 1. PRIVATE HELPERS ──────────────────────────────────────────────────────

/**
 * Upsert a row in user_astrology.
 * All astrology writes in this service funnel through here so the SQL is
 * defined exactly once.
 *
 * @param {string} userIdHash    - Hashed user ID
 * @param {string} zodiacSign    - Sun sign
 * @param {Object} astrologyData - Astrology data object
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
 *
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

// ─── 2. ASTROLOGY — DATABASE OPERATIONS ──────────────────────────────────────

/**
 * Save only the sun sign when full location data is unavailable.
 * Non-fatal: errors are logged but do not interrupt the caller.
 *
 * @param {string} userIdHash - Hashed user ID
 * @param {string} birthDate  - Birth date in YYYY-MM-DD format
 */
export async function saveMinimalAstrology(userIdHash, birthDate) {
  try {
    const sunSign = calculateSunSignFromDate(birthDate);
    if (!sunSign) return;
    await upsertUserAstrology(userIdHash, sunSign, buildMinimalAstrologyData(sunSign));
  } catch (err) {
    logErrorFromCatch(err, 'free-trial', '[ASTROLOGY-SERVICE] Failed to save minimal astrology');
  }
}

/**
 * Persist full astrology data returned from an external calculation.
 * No-op when either argument is falsy.
 *
 * @param {string} userIdHash    - Hashed user ID
 * @param {string} zodiacSign    - Zodiac (sun) sign
 * @param {Object} astrologyData - Full astrology result object
 */
export async function saveFullAstrologyData(userIdHash, zodiacSign, astrologyData) {
  if (!zodiacSign || !astrologyData) return;
  await upsertUserAstrology(userIdHash, zodiacSign, astrologyData);
}

/**
 * Delete stale astrology-category messages so the next request regenerates them.
 * Non-fatal: errors are logged but do not interrupt the caller.
 *
 * @param {string} userIdHash - Hashed user ID
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
    logErrorFromCatch(err, 'free-trial', '[ASTROLOGY-SERVICE] Failed to clear astrology messages');
  }
}

// ─── 3. BIRTH CHART VIA LAMBDA ───────────────────────────────────────────────

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
 * Note: lambda-astrology.js is imported dynamically to avoid circular-dependency
 * issues at module load time — this is the established pattern project-wide.
 *
 * @param {string} tempUserId   - Temporary user ID
 * @param {Object} personalInfo - Personal information object
 */
export async function calculateAndSaveFullBirthChart(tempUserId, personalInfo) {
  const { birthTime, birthCountry, birthProvince, birthCity, birthDate, birthTimezone } = personalInfo;

  if (!birthCountry || !birthProvince || !birthCity || !birthDate) return;

  try {
    // Small delay to ensure preceding DB writes are fully propagated
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { calculateBirthChart } = await import('../lambda-astrology.js');

    const result = await calculateBirthChart({
      birth_date:     birthDate,
      birth_time:     birthTime || '12:00:00',
      birth_country:  birthCountry,
      birth_province: birthProvince,
      birth_city:     birthCity,
      birth_timezone: birthTimezone,
    });

    if (result.success) {
      const userIdHash = hashUserId(tempUserId);
      const zodiacSign = result.sun_sign || calculateSunSignFromDate(birthDate);
      await upsertUserAstrology(userIdHash, zodiacSign, result);
    } else {
      console.error('[ASTROLOGY-SERVICE] Birth chart calculation failed:', result.error);
    }
  } catch (err) {
    logErrorFromCatch(err, 'free-trial', '[ASTROLOGY-SERVICE] Failed to calculate birth chart');
  }
}

// ─── 4. ZODIAC SIGN RESOLUTION ───────────────────────────────────────────────

/**
 * Midpoint birth dates for each zodiac sign.
 * Used to generate a synthetic birth date when a user picks their sign manually
 * (without entering actual birth info). Year 2000 is arbitrary — only month/day
 * matters. Each date falls squarely in the middle of its sign's range.
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
    logErrorFromCatch(err, 'free-trial', '[ASTROLOGY-SERVICE] Failed to save synthetic birth date');
  }
}

/**
 * Resolve the zodiac sign for a free trial user using a three-tier fallback:
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
          sunSign:      ad.sun_sign    || zodiacSign,
          moonSign:     ad.moon_sign   || null,
          risingSign:   ad.rising_sign || null,
          sunDegree:    ad.sun_degree    != null ? ad.sun_degree    : null,
          moonDegree:   ad.moon_degree   != null ? ad.moon_degree   : null,
          risingDegree: ad.rising_degree != null ? ad.rising_degree : null,
        };
      }
    } else if (zodiacSign) {
      // Row exists but astrology_data is null — backfill it now so the horoscope
      // handler never hits the "incomplete birth chart" guard.
      try {
        await upsertUserAstrology(userIdHash, zodiacSign, buildMinimalAstrologyData(zodiacSign));
      } catch (fillErr) {
        logErrorFromCatch(fillErr, 'free-trial', '[ASTROLOGY-SERVICE] Failed to backfill astrology_data');
      }
    }
  }

  // 2. Fallback: calculate from the stored birth date.
  // Use CASE to guard against NULL birth_date_encrypted — pgp_sym_decrypt on a NULL
  // bytea can throw "Wrong key or corrupt data" on some pgcrypto builds.
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
        if (zodiacSign) {
          try {
            await upsertUserAstrology(userIdHash, zodiacSign, buildMinimalAstrologyData(zodiacSign));
          } catch (writeErr) {
            logErrorFromCatch(writeErr, 'free-trial', '[ASTROLOGY-SERVICE] Failed to persist birth-date-derived astrology');
          }
        }
      }
    } catch (bdErr) {
      // Non-fatal — log and continue to the next fallback (sign-picker param)
      logErrorFromCatch(bdErr, 'free-trial', '[ASTROLOGY-SERVICE] Failed to decrypt birth date; falling through to signParam');
    }
  }

  // 3. Final fallback: client-supplied sign (sign-picker UI).
  // Persisted so subsequent calls can find the sign in the DB.
  if (!zodiacSign && signParam) {
    zodiacSign = String(signParam).toLowerCase();
    await persistPickedZodiacSign(userIdHash, zodiacSign, tempUserId);
  }

  return { zodiacSign, chartData };
}
