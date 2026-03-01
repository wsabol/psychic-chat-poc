/**
 * dateUtils – Shared date formatting helpers for the security/verification UI.
 */

/**
 * Formats an ISO date string into a short human-readable date.
 * Returns "Unknown" for falsy inputs.
 *
 * @param {string|null|undefined} dateString
 * @returns {string}  e.g. "Mar 5, 2025"
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'Unknown';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};
