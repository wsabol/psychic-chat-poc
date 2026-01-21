/**
 * Job Scheduler - Fixed Version with Debug Logging
 * Initializes and manages scheduled tasks
 * Jobs: Temp account cleanup, account cleanup, subscription checks
 */

import cron from 'node-cron';
import { runAccountCleanupJob, getCleanupJobStatus } from './accountCleanupJob.js';
import { runSubscriptionCheckJob, getSubscriptionCheckJobStatus } from './subscriptionCheckJob.js';
import { runTempAccountCleanupJob, getTempAccountCleanupJobStatus } from './tempAccountCleanupJob.js';
import { logErrorFromCatch } from '../shared/errorLogger.js';

let cleanupJobHandle = null;
let subscriptionCheckJobHandle = null;
let tempAccountCleanupJobHandle = null;

/**
 * Initialize all scheduled jobs
 */
export function initializeScheduler() {
  try {

    
    // Schedule temp account cleanup job to run every 8 hours (0, 8, 16 UTC)
    tempAccountCleanupJobHandle = cron.schedule('0 */8 * * *',
      async () => {
        try {
          const result = await runTempAccountCleanupJob();

        } catch (error) {
          logErrorFromCatch(error, 'scheduler', 'Temp account cleanup job failed');
        }
      },
      {
        scheduled: true,
        timezone: 'UTC'
      }
    );
    
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
    
    // Schedule subscription check job to run every 4 hours
    subscriptionCheckJobHandle = cron.schedule('0 */4 * * *',
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

    // Optional: For testing, run immediately (non-blocking)
    if (process.env.CLEANUP_RUN_ON_STARTUP === 'true') {
      
      setImmediate(async () => {
        try {
          const result = await runTempAccountCleanupJob();
        } catch (e) {
          console.error('[Scheduler] ✗ Temp account cleanup failed:', e.message);
          logErrorFromCatch(e, 'scheduler', 'Run temp account cleanup job on startup');
        }
      });
      
      setImmediate(async () => {
        try {
          const result = await runAccountCleanupJob();
        } catch (e) {
          console.error('[Scheduler] ✗ Account cleanup failed:', e.message);
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
      tempAccountCleanup: tempAccountCleanupJobHandle,
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
    if (tempAccountCleanupJobHandle) {
      tempAccountCleanupJobHandle.stop();
      tempAccountCleanupJobHandle.destroy();
    }

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
 * Manually trigger temp account cleanup (for testing/admin)
 */
export async function triggerTempAccountCleanupJobManually() {
  return await runTempAccountCleanupJob();
}

/**
 * Get scheduler status
 */
export async function getSchedulerStatus() {
  return {
    status: 'running',
    jobs: {
      tempAccountCleanup: {
        name: 'Temporary Account Cleanup Job',
        schedule: '0 1 * * * (daily at 01:00 UTC)',
        active: tempAccountCleanupJobHandle?.status === 'scheduled',
        stats: await getTempAccountCleanupJobStatus()
      },
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

export default { initializeScheduler, stopScheduler, triggerCleanupJobManually, triggerTempAccountCleanupJobManually, getSchedulerStatus };
