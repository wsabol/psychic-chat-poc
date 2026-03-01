/**
 * Admin Auth Service
 *
 * Owns the canonical list of admin email addresses and the single helper that
 * checks whether a given email belongs to an admin.
 *
 * Keeping this in its own file means:
 *   • The email list has one obvious place to edit.
 *   • Callers that only need `isAdmin` don't pull in IP/device-trust logic.
 */

/** Hard-coded admin email addresses (lower-case for consistent comparison). */
export const ADMIN_EMAILS = [
  'starshiptechnology1@gmail.com',
  'wsabol39@gmail.com',
];

/**
 * Returns true if the supplied email belongs to a known admin account.
 * Comparison is case-insensitive.
 *
 * @param {string} userEmail
 * @returns {Promise<boolean>}
 */
export async function isAdmin(userEmail) {
  return ADMIN_EMAILS.includes(userEmail.toLowerCase());
}
