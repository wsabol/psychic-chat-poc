/**
 * Job Scheduler
 * Initializes and manages scheduled tasks
 * Jobs: Account cleanup, subscription checks, policy notifications, price migrations
 *
 * NOTE: Temp account cleanup was retired — temp accounts are no longer created in Firebase.
 * The corresponding Lambda was also removed from AWS. Do not re-add it here.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import cron from 'node-cron';
import { runAccountCleanupJob, getCleanupJobStatus } from './accountCleanupJob.js';
import { runSubscriptionCheckJob, getSubscriptionCheckJobStatus } from './subscriptionCheckJob.js';
import { sendReminderNotifications, enforceGracePeriodExpiration, getPolicyNotificationJobStatus } from './policyChangeNotificationJob.js';
import { processPendingMigrations } from './priceChangeMigrationJob.js';
import { logErrorFromCatch } from '../shared/errorLogger.js';

let cleanupJobHandle = null;
let subscriptionCheckJobHandle = null;
let policyReminderJobHandle = null;
let gracePeriodEnforcementJobHandle = null;
let priceChangeMigrationJobHandle = null;

// Path for persisting last-run timestamps across restarts.
// Uses the OS temp dir so it survives hot-reloads and nodemon restarts within
// the same container/machine, but resets naturally between deployments.
const LAST_RUNS_FILE = path.join(os.tmpdir(), 'scheduler-last-runs.json');

/**
 * Read the persisted last-run map from disk.
 * Returns an empty object if the file doesn't exist yet (first boot).
 */
function readLastRuns() {
  try {
    return JSON.parse(fs.readFileSync(LAST_RUNS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Persist the updated last-run map to disk.
 * Failures are non-fatal — worst case we just run a catch-up job twice.
 */
function persistLastRun(jobKey, isoTimestamp) {
  try {
    const runs = readLastRuns();
    runs[jobKey] = isoTimestamp;
    fs.writeFileSync(LAST_RUNS_FILE, JSON.stringify(runs, null, 2), 'utf8');
  } catch (err) {
    console.warn(`[Scheduler] ⚠️  Could not persist last-run time for "${jobKey}":`, err.message);
  }
}

/**
 * Detects scheduled windows that were missed while the server was down and
 * runs the corresponding jobs immediately via setImmediate (non-blocking).
 *
 * WHY: node-cron fires a "missed execution" WARN on startup whenever a job's
 * previous fire-time is in the past — meaning the process was not running at
 * that moment (e.g. nodemon restart, container restart).  This function turns
 * that warning into real recovery work.
 *
 * SAFETY: Last-run timestamps are persisted to disk so rapid successive
 * restarts (e.g. nodemon hot-reload) don't execute the same catch-up twice.
 *
 * Only the grace-period enforcement job (every 6 h) gets automatic catch-up.
 * Daily jobs (cleanup, subscription check, etc.) are intentionally excluded —
 * the side-effects of running them twice outweigh missing one nightly window.
 */
function runMissedJobsOnStartup() {
  const now = new Date();
  const lastRuns = readLastRuns();

  // ── Grace period enforcement ─────────────────────────────────────────────
  // Schedule: '20 */6 * * *'  →  fires at 00:20, 06:20, 12:20, 18:20 UTC
  {
    const JOB_KEY = 'gracePeriodEnforcement';
    const PERIOD_MS = 6 * 60 * 60 * 1000; // 6 hours

    // Compute the most-recent expected fire time (beginning of current 6 h block + 20 min)
    const blockHour = Math.floor(now.getUTCHours() / 6) * 6;
    let lastExpected = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), blockHour, 20, 0
    ));
    // If :20 hasn't arrived yet in this block, step back one period
    if (lastExpected > now) {
      lastExpected = new Date(lastExpected.getTime() - PERIOD_MS);
    }

    const sinceExpiredMs = now.getTime() - lastExpected.getTime();

    // Was this window already covered by a previous (rapid) restart?
    const lastRanAt = lastRuns[JOB_KEY] ? new Date(lastRuns[JOB_KEY]) : null;
    const alreadyCaughtUp = lastRanAt && lastRanAt >= lastExpected;

    // Catch-up conditions:
    //   • fire-time is genuinely in the past (>5 s buffer avoids race with live cron tick)
    //   • still within the 6-hour window — older misses are outside our recovery scope
    //   • we haven't already run a catch-up for this same window
    const BUFFER_MS = 5_000;
    if (sinceExpiredMs > BUFFER_MS && sinceExpiredMs < PERIOD_MS && !alreadyCaughtUp) {
      console.warn(
        `[Scheduler] ⚠️  Grace period enforcement missed window at ` +
        `${lastExpected.toISOString()} ` +
        `(${Math.round(sinceExpiredMs / 60_000)} min ago) — running catch-up now.`
      );
      persistLastRun(JOB_KEY, now.toISOString());
      setImmediate(async () => {
        try {
          await enforceGracePeriodExpiration();
          console.info('[Scheduler] ✔  Grace period enforcement catch-up completed.');
        } catch (error) {
          logErrorFromCatch(error, 'scheduler', 'Grace period enforcement startup catch-up');
        }
      });
    }
  }
}

/**
 * Initialize all scheduled jobs
 */
export function initializeScheduler() {
  try {

    
    // Schedule account cleanup job to run daily at 2:00 AM UTC
    cleanupJobHandle = cron.schedule('0 2 * * *',
      () => {
        // Use setImmediate so the cron tick completes synchronously (preventing
        // node-cron "missed execution" warnings) and the async work runs in the
        // next event-loop iteration without blocking the scheduler.
        setImmediate(async () => {
          try {
            await runAccountCleanupJob();
          } catch (error) {
            logErrorFromCatch(error, 'scheduler', 'Account cleanup job failed');
          }
        });
      },
      { 
        scheduled: true,
        timezone: 'UTC'
      }
    );
    
    // Schedule subscription check job to run once daily at 01:00 UTC.
    // Real-time Google Play renewals are handled by the RTDN webhook; this job
    // is a daily safety net that also covers Stripe subscriptions.
    subscriptionCheckJobHandle = cron.schedule('0 1 * * *',
      () => {
        setImmediate(async () => {
          try {
            await runSubscriptionCheckJob();
          } catch (error) {
            logErrorFromCatch(error, 'scheduler', 'Subscription check job failed');
          }
        });
      },
      {
        scheduled: true,
        timezone: 'UTC'
      }
    );

    // Schedule policy reminder notification job to run daily at 3:00 AM UTC
    // Sends reminder emails 21 days after initial notification (9 days before 30-day deadline)
    policyReminderJobHandle = cron.schedule('0 3 * * *',
      () => {
        setImmediate(async () => {
          try {
            await sendReminderNotifications();
          } catch (error) {
            logErrorFromCatch(error, 'scheduler', 'Policy reminder notification job failed');
          }
        });
      },
      {
        scheduled: true,
        timezone: 'UTC'
      }
    );

    // Schedule grace period enforcement job to run every 6 hours (offset by 20 min to avoid collision with subscription check job)
    // Automatically logs out users whose grace period has expired without accepting new terms
    gracePeriodEnforcementJobHandle = cron.schedule('20 */6 * * *',
      () => {
        setImmediate(async () => {
          try {
            await enforceGracePeriodExpiration();
          } catch (error) {
            logErrorFromCatch(error, 'scheduler', 'Grace period enforcement job failed');
          }
        });
      },
      {
        scheduled: true,
        timezone: 'UTC'
      }
    );

    // Schedule price change migration job to run daily at 4:00 AM UTC
    // Automatically migrates subscriptions after 30-day notice period expires
    priceChangeMigrationJobHandle = cron.schedule('0 4 * * *',
      () => {
        setImmediate(async () => {
          try {
            await processPendingMigrations();
          } catch (error) {
            logErrorFromCatch(error, 'scheduler', 'Price change migration job failed');
          }
        });
      },
      {
        scheduled: true,
        timezone: 'UTC'
      }
    );

    // Startup catch-up: if the server was down during a scheduled window, run
    // missed jobs immediately so no enforcement cycle is skipped.
    // node-cron fires a "missed execution" WARN whenever it initializes and
    // detects the previous fire-time is in the past — this is that scenario.
    runMissedJobsOnStartup();

    // Optional: For testing, run immediately (non-blocking)
    if (process.env.CLEANUP_RUN_ON_STARTUP === 'true') {
      setImmediate(async () => {
        try {
          await runAccountCleanupJob();
        } catch (e) {
          logErrorFromCatch(e, 'scheduler', 'Run account cleanup job on startup');
        }
      });
    } 
    // Optional: Run subscription check on startup for testing (non-blocking)
    if (process.env.SUBSCRIPTION_CHECK_RUN_ON_STARTUP === 'true') {
      setImmediate(() => {
        runSubscriptionCheckJob().catch(e => {
          logErrorFromCatch(e, 'scheduler', 'Run subscription check on startup');
        });
      });
    }
    return {
      cleanup: cleanupJobHandle,
      subscriptionCheck: subscriptionCheckJobHandle,
      policyReminder: policyReminderJobHandle,
      gracePeriodEnforcement: gracePeriodEnforcementJobHandle,
      priceChangeMigration: priceChangeMigrationJobHandle
    };
  } catch (error) {
    logErrorFromCatch('[Scheduler] FATAL ERROR during initialization:');
    logErrorFromCatch('Message:', error.message);
    logErrorFromCatch('Stack:', error.stack);
    throw error;
  }
}

/**
 * Stop all scheduled jobs
 */
export function stopScheduler() {
  try {
    if (cleanupJobHandle) {
      cleanupJobHandle.stop();
      cleanupJobHandle.destroy();
    }

    if (subscriptionCheckJobHandle) {
      subscriptionCheckJobHandle.stop();
      subscriptionCheckJobHandle.destroy();
    }

    if (policyReminderJobHandle) {
      policyReminderJobHandle.stop();
      policyReminderJobHandle.destroy();
    }

    if (gracePeriodEnforcementJobHandle) {
      gracePeriodEnforcementJobHandle.stop();
      gracePeriodEnforcementJobHandle.destroy();
    }

    if (priceChangeMigrationJobHandle) {
      priceChangeMigrationJobHandle.stop();
      priceChangeMigrationJobHandle.destroy();
    }
  } catch (error) {
    logErrorFromCatch('[Scheduler] Error stopping scheduler:', error.message);
  }
}

/**
 * Manually trigger cleanup job (for testing/admin)
 */
export async function triggerCleanupJobManually() {
  return await runAccountCleanupJob();
}

/**
 * Get scheduler status
 */
export async function getSchedulerStatus() {
  return {
    status: 'running',
    jobs: {
      cleanup: {
        name: 'Account Cleanup Job',
        schedule: '0 2 * * * (daily at 02:00 UTC)',
        active: cleanupJobHandle?.status === 'scheduled',
        stats: await getCleanupJobStatus()
      },
      subscriptionCheck: {
        name: 'Subscription Check Job',
        schedule: '0 1 * * * (daily at 01:00 UTC)',
        active: subscriptionCheckJobHandle?.status === 'scheduled',
        stats: getSubscriptionCheckJobStatus()
      }
    }
  };
}

export default { initializeScheduler, stopScheduler, triggerCleanupJobManually, getSchedulerStatus };
