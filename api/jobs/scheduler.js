/**
 * Job Scheduler
 * Initializes and manages scheduled tasks
 * Jobs: Account cleanup, subscription checks, policy notifications, price migrations
 *
 * NOTE: Temp account cleanup was retired — temp accounts are no longer created in Firebase.
 * The corresponding Lambda was also removed from AWS. Do not re-add it here.
 */

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

/**
 * Initialize all scheduled jobs
 */
export function initializeScheduler() {
  try {

    
    // Schedule account cleanup job to run daily at 2:00 AM UTC
    cleanupJobHandle = cron.schedule('0 2 * * *', 
      async () => {
        try {
          await runAccountCleanupJob();
        } catch (error) {
          logErrorFromCatch(error, 'scheduler', 'Account cleanup job failed');
        }
      },
      { 
        scheduled: true,
        timezone: 'UTC'
      }
    );
    
    // Schedule subscription check job to run every 4 hours (offset by 10 min to avoid collision with grace period job)
    subscriptionCheckJobHandle = cron.schedule('10 */4 * * *',
      async () => {
        try {
          await runSubscriptionCheckJob();
        } catch (error) {
          logErrorFromCatch(error, 'scheduler', 'Subscription check job failed');
        }
      },
      {
        scheduled: true,
        timezone: 'UTC'
      }
    );

    // Schedule policy reminder notification job to run daily at 3:00 AM UTC
    // Sends reminder emails 21 days after initial notification (9 days before 30-day deadline)
    policyReminderJobHandle = cron.schedule('0 3 * * *',
      async () => {
        try {
          await sendReminderNotifications();
        } catch (error) {
          logErrorFromCatch(error, 'scheduler', 'Policy reminder notification job failed');
        }
      },
      {
        scheduled: true,
        timezone: 'UTC'
      }
    );

    // Schedule grace period enforcement job to run every 6 hours (offset by 20 min to avoid collision with subscription check job)
    // Automatically logs out users whose grace period has expired without accepting new terms
    gracePeriodEnforcementJobHandle = cron.schedule('20 */6 * * *',
      async () => {
        try {
          await enforceGracePeriodExpiration();
        } catch (error) {
          logErrorFromCatch(error, 'scheduler', 'Grace period enforcement job failed');
        }
      },
      {
        scheduled: true,
        timezone: 'UTC'
      }
    );

    // Schedule price change migration job to run daily at 4:00 AM UTC
    // Automatically migrates subscriptions after 30-day notice period expires
    priceChangeMigrationJobHandle = cron.schedule('0 4 * * *',
      async () => {
        try {
          await processPendingMigrations();
        } catch (error) {
          logErrorFromCatch(error, 'scheduler', 'Price change migration job failed');
        }
      },
      {
        scheduled: true,
        timezone: 'UTC'
      }
    );

    // Optional: For testing, run immediately (non-blocking)
    if (process.env.CLEANUP_RUN_ON_STARTUP === 'true') {
      
      setImmediate(async () => {
        try {
          const result = await runAccountCleanupJob();
        } catch (e) {
          logErrorFromCatch('[Scheduler] ✗ Account cleanup failed:', e.message);
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
        schedule: '0 */4 * * * (every 4 hours)',
        active: subscriptionCheckJobHandle?.status === 'scheduled',
        stats: getSubscriptionCheckJobStatus()
      }
    }
  };
}

export default { initializeScheduler, stopScheduler, triggerCleanupJobManually, getSchedulerStatus };
