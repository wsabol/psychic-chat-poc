/**
 * RETIRED — Temp Account Cleanup Lambda
 *
 * This Lambda previously ran every 8 hours via EventBridge to scan Firebase
 * for temporary accounts (temp_*@psychic.local) and delete them.
 *
 * It is no longer needed because:
 *   - Free-trial users are now identified by a locally-generated UUID stored
 *     in localStorage and the database only.
 *   - No Firebase account is ever created for free-trial users.
 *   - Stale guest sessions are cleaned up by the server-side
 *     tempAccountCleanupJob (api/jobs/tempAccountCleanupJob.js) which runs
 *     on the same 8-hour schedule and queries free_trial_sessions directly.
 *
 * Action required:
 *   1. Disable / delete the EventBridge rule that triggers this Lambda.
 *   2. Delete this Lambda function from AWS.
 *   3. Remove any IAM roles/policies that were created solely for this Lambda.
 *
 * This file is kept as a no-op handler so the Lambda does not crash if it
 * fires before the EventBridge rule is removed.
 */

export const handler = async (_event) => {
  console.log('[temp-account-cleanup] RETIRED: This Lambda is no longer needed. Please delete it and its EventBridge trigger.');
  return {
    statusCode: 200,
    body: JSON.stringify({
      retired: true,
      message: 'This Lambda is retired. Free-trial users no longer use Firebase accounts. Please delete this Lambda and its EventBridge rule.'
    })
  };
};

export default { handler };
