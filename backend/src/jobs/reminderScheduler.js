const cron = require('node-cron');
const notificationService = require('../services/notificationService');

let cronJob = null;

const startReminderJob = () => {
  if (cronJob) return cronJob;

  const cronSchedule = process.env.REMINDER_JOB_CRON || '0 9 * * *'; // Default 9:00 AM daily
  const timezone = process.env.APP_TIMEZONE || 'Asia/Kolkata';

  cronJob = cron.schedule(
    cronSchedule,
    async () => {
      console.log(`[Reminder Job] Executing scheduled deadline check at ${new Date().toISOString()} (${timezone})...`);
      try {
        const result = await notificationService.checkAndGenerateReminders();
        console.log(`[Reminder Job] Deadline check complete. Generated ${result.generatedCount} notification(s).`);
      } catch (err) {
        console.error('[Reminder Job Error]:', err.message);
      }
    },
    {
      timezone
    }
  );

  console.log(`[Reminder Job] Scheduled with cron "${cronSchedule}" in timezone "${timezone}".`);
  return cronJob;
};

const stopReminderJob = () => {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log('[Reminder Job] Stopped.');
  }
};

module.exports = {
  startReminderJob,
  stopReminderJob
};
