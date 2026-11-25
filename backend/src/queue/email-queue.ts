import { Queue } from 'bullmq';
import { createRedisConnection } from '../config/redis';

export const QUEUE_NAME = 'email-queue';

export const emailQueue = new Queue(QUEUE_NAME, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    removeOnComplete: { age: 3600 * 24, count: 5000 },
    removeOnFail: { age: 3600 * 24 * 7, count: 10000 },
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

export const scheduleEmailJob = async (
  emailId: string,
  scheduledAt: Date,
): Promise<void> => {
  const now = Date.now();
  const delay = Math.max(0, scheduledAt.getTime() - now);
  const jobId = `send-email-${emailId}`;

  // Check if job already exists
  const existingJob = await emailQueue.getJob(jobId);
  if (existingJob) {
    const state = await existingJob.getState();
    if (state === 'delayed' || state === 'waiting' || state === 'active') {
      return; // Job already exists and is pending
    }
  }

  await emailQueue.add(
    'send-email',
    { emailId },
    {
      jobId,
      delay,
      removeOnComplete: { age: 3600 * 24 },
      removeOnFail: { age: 3600 * 24 * 7 },
    }
  );
};

export const rescheduleEmailJob = async (
  emailId: string,
  newScheduledAt: Date,
): Promise<void> => {
  const jobId = `send-email-${emailId}`;
  const existingJob = await emailQueue.getJob(jobId);
  if (existingJob) {
    try {
      await existingJob.remove();
    } catch {
      // Job may be active
    }
  }

  const now = Date.now();
  const delay = Math.max(0, newScheduledAt.getTime() - now);

  await emailQueue.add(
    'send-email',
    { emailId },
    {
      jobId,
      delay,
      removeOnComplete: { age: 3600 * 24 },
      removeOnFail: { age: 3600 * 24 * 7 },
    }
  );
};
