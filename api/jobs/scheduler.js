/**
 * Job Scheduler
 * Initializes and manages scheduled tasks
 * Currently: Daily account cleanup job
 */

import cron from 'node-cron';
import { runAccountCleanupJob, getCleanupJobStatus } from './accountCleanupJob.js';
import { logErrorFromCatch } from '../shared/errorLogger.js';

let cleanupJobHandle = null;

/**
 * Initialize all scheduled jobs
 */
export function initializeScheduler() {

  // Schedule account cleanup job to run daily at 2:00 AM UTC
  // Format: minute hour day month dayOfWeek
  cleanupJobHandle = cron.schedule('0 2 * * *', async () => {
    await runAccountCleanupJob();
  });

    // Optional: For testing, run immediately
  if (process.env.CLEANUP_RUN_ON_STARTUP === 'true') {
    runAccountCleanupJob().catch(e => {
      logErrorFromCatch(e, 'scheduler', 'Run cleanup job on startup');
    });
  }

  return {
    cleanup: cleanupJobHandle
  };
}

/**
 * Stop all scheduled jobs
 */
export function stopScheduler() {
  
  if (cleanupJobHandle) {
    cleanupJobHandle.stop();
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
        active: cleanupJobHandle?.status === 'scheduled'
      }
    },
    lastRun: process.env.LAST_CLEANUP_RUN || 'never',
    stats: await getCleanupJobStatus()
  };
}

export default { initializeScheduler, stopScheduler, triggerCleanupJobManually, getSchedulerStatus };
