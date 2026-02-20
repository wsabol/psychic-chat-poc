/**
 * RETIRED — cleanupOrphanedFirebaseAccounts
 *
 * This job previously scanned Firebase for orphaned temp_*@psychic.local
 * accounts and deleted them.
 *
 * It is no longer needed because free-trial users are now identified by a
 * locally-generated UUID stored in localStorage/database only — no Firebase
 * account is ever created for free-trial users.
 *
 * The function below is kept as a no-op so that any remaining call sites
 * (e.g. tempAccountCleanupJob.js) do not break before those references are
 * removed. It can safely be deleted once all call sites are cleaned up.
 */

export function cleanupOrphanedFirebaseAccountsAsync(_ageThreshold) {
  // No-op: Firebase temp accounts no longer exist.
}

export default { cleanupOrphanedFirebaseAccountsAsync };
