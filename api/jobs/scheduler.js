/**
 * Job Scheduler - Fixed Version
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
  try {
    console.log('[Scheduler] Creating cleanup job...');
    
    // Schedule account cleanup job to run daily at 2:00 AM UTC
    cleanupJobHandle = cron.schedule('0 2 * * *', 
      async () => {
        try {
          console.log('[Scheduler] Running cleanup job...');
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

    console.log('[Scheduler] Creating subscription check job...');
    
    // Schedule subscription check job to run every 4 hours
    subscriptionCheckJobHandle = cron.schedule('0 */4 * * *',
      async () => {
        try {
          console.log('[Scheduler] Running subscription check job...');
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

    console.log('[Scheduler] Both jobs scheduled successfully');

    // Optional: For testing, run immediately (non-blocking)
    if (process.env.CLEANUP_RUN_ON_STARTUP === 'true') {
      console.log('[Scheduler] Running cleanup job on startup...');
      setImmediate(() => {
        runAccountCleanupJob().catch(e => {
          logErrorFromCatch(e, 'scheduler', 'Run cleanup job on startup');
        });
      });
    }

    // Optional: Run subscription check on startup for testing (non-blocking)
    if (process.env.SUBSCRIPTION_CHECK_RUN_ON_STARTUP === 'true') {
      console.log('[Scheduler] Running subscription check on startup...');
      setImmediate(() => {
        runSubscriptionCheckJob().catch(e => {
          logErrorFromCatch(e, 'scheduler', 'Run subscription check on startup');
        });
      });
    }

    return {
      cleanup: cleanupJobHandle,
      subscriptionCheck: subscriptionCheckJobHandle
    };
  } catch (error) {
    console.error('[Scheduler] FATAL ERROR during initialization:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
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
  } catch (error) {
    console.error('[Scheduler] Error stopping scheduler:', error.message);
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
