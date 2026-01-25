/**
 * Data Utility Functions
 * Shared utilities for parsing and formatting data
 */

/**
 * Parse count value from database row
 * @param {Object} row - Database row
 * @returns {number} Parsed count or 0
 */
export const parseCount = (row) => globalThis.parseInt(row.count) || 0;

/**
 * Parse integer value safely
 * @param {*} val - Value to parse
 * @returns {number} Parsed integer or 0
 */
export const parseIntVal = (val) => globalThis.parseInt(val) || 0;

/**
 * Parse float value safely
 * @param {*} val - Value to parse
 * @returns {number} Parsed float or 0
 */
export const parseFloatVal = (val) => parseFloat(val) || 0;

/**
 * Calculate percentage safely
 * @param {number} part - Numerator
 * @param {number} total - Denominator
 * @returns {string} Percentage formatted to 2 decimal places
 */
export const calculatePercent = (part, total) => {
  if (!total) return '0.00';
  return ((part / total) * 100).toFixed(2);
};

/**
 * Parse multiple row values at once
 * @param {Object} row - Database row
 * @param {Array<string>} fields - Field names to parse as integers
 * @returns {Object} Object with parsed values
 */
export const parseRowIntegers = (row, fields) => {
  const result = {};
  fields.forEach(field => {
    result[field] = parseIntVal(row[field]);
  });
  return result;
};

/**
 * Parse multiple row values as floats
 * @param {Object} row - Database row
 * @param {Array<string>} fields - Field names to parse as floats
 * @returns {Object} Object with parsed values
 */
export const parseRowFloats = (row, fields) => {
  const result = {};
  fields.forEach(field => {
    result[field] = parseFloatVal(row[field]);
  });
  return result;
};
