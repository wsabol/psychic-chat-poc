/**
 * Validation Utilities
 * Common validation functions for data processing
 */

/**
 * Month name to number mapping (supports full names and 3-letter abbreviations)
 */
const MONTH_MAP = {
  jan: '01', january: '01',
  feb: '02', february: '02',
  mar: '03', march: '03',
  apr: '04', april: '04',
  may: '05',
  jun: '06', june: '06',
  jul: '07', july: '07',
  aug: '08', august: '08',
  sep: '09', sept: '09', september: '09',
  oct: '10', october: '10',
  nov: '11', november: '11',
  dec: '12', december: '12',
};

/**
 * Parse and validate date string for storage.
 * Accepts multiple formats and normalises to YYYY-MM-DD.
 *
 * Supported formats:
 *   YYYY-MM-DD          (ISO – already correct)
 *   DD-Mon-YYYY         e.g. 09-Feb-1956
 *   DD Mon YYYY         e.g. 09 Feb 1956
 *   Mon DD YYYY         e.g. Feb 09 1956
 *   Mon-DD-YYYY         e.g. Feb-09-1956
 *   MM/DD/YYYY          e.g. 02/09/1956
 *   DD.MM.YYYY          e.g. 09.02.1956
 *   YYYY/MM/DD          e.g. 1956/02/09
 *
 * @param {string} dateString - Date string to parse
 * @returns {string|null} Validated date in YYYY-MM-DD format or null if invalid
 */
export function parseDateForStorage(dateString) {
  if (!dateString) return null;

  try {
    const trimmed = dateString.trim();

    // ── YYYY-MM-DD (ISO) ──────────────────────────────────────────
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    // ── YYYY/MM/DD ────────────────────────────────────────────────
    const yyyySlash = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (yyyySlash) {
      return `${yyyySlash[1]}-${yyyySlash[2].padStart(2,'0')}-${yyyySlash[3].padStart(2,'0')}`;
    }

    // ── DD-Mon-YYYY  or  DD Mon YYYY  (e.g. "09 Feb 1956") ───────
    const ddMonYyyy = trimmed.match(/^(\d{1,2})[-\s]([a-zA-Z]+)[-\s](\d{4})$/);
    if (ddMonYyyy) {
      const month = MONTH_MAP[ddMonYyyy[2].toLowerCase()];
      if (month) {
        return `${ddMonYyyy[3]}-${month}-${ddMonYyyy[1].padStart(2,'0')}`;
      }
    }

    // ── Mon-DD-YYYY  or  Mon DD YYYY  (e.g. "Feb 09 1956") ───────
    const monDdYyyy = trimmed.match(/^([a-zA-Z]+)[-\s](\d{1,2})[-\s](\d{4})$/);
    if (monDdYyyy) {
      const month = MONTH_MAP[monDdYyyy[1].toLowerCase()];
      if (month) {
        return `${monDdYyyy[3]}-${month}-${monDdYyyy[2].padStart(2,'0')}`;
      }
    }

    // ── MM/DD/YYYY ────────────────────────────────────────────────
    const mmDdYyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mmDdYyyy) {
      return `${mmDdYyyy[3]}-${mmDdYyyy[1].padStart(2,'0')}-${mmDdYyyy[2].padStart(2,'0')}`;
    }

    // ── DD.MM.YYYY ────────────────────────────────────────────────
    const ddMmYyyy = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (ddMmYyyy) {
      return `${ddMmYyyy[3]}-${ddMmYyyy[2].padStart(2,'0')}-${ddMmYyyy[1].padStart(2,'0')}`;
    }

    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Validate free trial step value
 * @param {string} step - Step value to validate
 * @returns {boolean} True if valid step
 */
export function isValidFreeTrialStep(step) {
  const validSteps = ['created', 'chat', 'personal_info', 'horoscope', 'completed'];
  return validSteps.includes(step);
}

/**
 * Get valid free trial steps
 * @returns {string[]} Array of valid step values
 */
export function getValidFreeTrialSteps() {
  return ['created', 'chat', 'personal_info', 'horoscope', 'completed'];
}

export default {
  parseDateForStorage,
  isValidFreeTrialStep,
  getValidFreeTrialSteps
};
