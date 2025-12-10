/**
 * Job Scheduler
 * Initializes and manages scheduled tasks
 * Currently: Daily account cleanup job
 */

import cron from 'node-cron';
import { runAccountCleanupJob, getCleanupJobStatus } from './accountCleanupJob.js';

let cleanupJobHandle = null;

/**
 * Initialize all scheduled jobs
 */
export function initializeScheduler() {
  console.log('[SCHEDULER] Initializing scheduled jobs...');

  // Schedule account cleanup job to run daily at 2:00 AM UTC
  // Format: minute hour day month dayOfWeek
  cleanupJobHandle = cron.schedule('0 2 * * *', async () => {
    console.log('[SCHEDULER] ⏰ Running scheduled cleanup job...');
    await runAccountCleanupJob();
  });

  console.log('[SCHEDULER] ✅ Cleanup job scheduled (daily at 02:00 UTC)');

  // Optional: For testing, run immediately
  if (process.env.CLEANUP_RUN_ON_STARTUP === 'true') {
    console.log('[SCHEDULER] Running cleanup job on startup (CLEANUP_RUN_ON_STARTUP=true)...');
    runAccountCleanupJob().catch(e => console.error('[SCHEDULER] Error:', e));
  }

  return {
    cleanup: cleanupJobHandle
  };
}

/**
 * Stop all scheduled jobs
 */
export function stopScheduler() {
  console.log('[SCHEDULER] Stopping scheduled jobs...');
  
  if (cleanupJobHandle) {
    cleanupJobHandle.stop();
    console.log('[SCHEDULER] ✅ Cleanup job stopped');
  }
}

/**
 * Manually trigger cleanup job (for testing/admin)
 */
export async function triggerCleanupJobManually() {
  console.log('[SCHEDULER] Manual trigger: Running cleanup job now...');
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
