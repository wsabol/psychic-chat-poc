/**
 * Job Scheduler
 * Initializes and manages scheduled tasks
 * Currently: Daily account cleanup job
 */

import cron from 'node-cron';
import { runAccountCleanupJob, getCleanupJobStatus } from './accountCleanupJob.js';
import { runSubscriptionCheckJob, getSubscriptionCheckJobStatus } from './subscriptionCheckJob.js';
import { logErrorFromCatch } from '../shared/errorLogger.js';

let cleanupJobHandle = null;
let subscriptionCheckJobHandle = null;

/**
 * Initialize all scheduled jobs
 */
export function initializeScheduler() {

    // Schedule account cleanup job to run daily at 2:00 AM UTC
  // Format: minute hour day month dayOfWeek
  cleanupJobHandle = cron.schedule('0 2 * * *', async () => {
    await runAccountCleanupJob();
  });

  // Schedule subscription check job to run every 4 hours
  // Runs at: 00:00, 04:00, 08:00, 12:00, 16:00, 20:00 UTC
  subscriptionCheckJobHandle = cron.schedule('0 */4 * * *', async () => {
    try {
      await runSubscriptionCheckJob();
    } catch (error) {
      logErrorFromCatch(error, 'scheduler', 'Subscription check job failed');
    }
  });

  // Optional: For testing, run immediately
  if (process.env.CLEANUP_RUN_ON_STARTUP === 'true') {
    runAccountCleanupJob().catch(e => {
      logErrorFromCatch(e, 'scheduler', 'Run cleanup job on startup');
    });
  }

  // Optional: Run subscription check on startup for testing
  if (process.env.SUBSCRIPTION_CHECK_RUN_ON_STARTUP === 'true') {
    runSubscriptionCheckJob().catch(e => {
      logErrorFromCatch(e, 'scheduler', 'Run subscription check on startup');
    });
  }

  return {
    cleanup: cleanupJobHandle,
    subscriptionCheck: subscriptionCheckJobHandle
  };
}

/**
 * Stop all scheduled jobs
 */
export function stopScheduler() {
  
  if (cleanupJobHandle) {
    cleanupJobHandle.stop();
  }

  if (subscriptionCheckJobHandle) {
    subscriptionCheckJobHandle.stop();
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
