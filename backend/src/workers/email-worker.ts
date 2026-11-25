import { DelayedError, Job, Worker } from 'bullmq';
import { createRedisConnection } from '../config/redis';
import { prisma } from '../config/prisma';
import { config } from '../config';
import { QUEUE_NAME } from '../queue/email-queue';
import { sendEmail } from '../services/smtp';
import { checkHourlyRateLimit, checkMinDelay } from '../services/rate-limiter';
import { indexEmail, updateEmailStatus } from '../services/search';
import { sendSlackRateLimitNotification } from '../services/slack';

export const createEmailWorker = (): Worker => {
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job, token?: string) => {
      const { emailId } = job.data;
      console.log(`[Worker] Processing email ${emailId}`);

      // 1. Load email from database
      const email = await prisma.email.findUnique({
        where: { id: emailId },
        include: { sender: true, campaign: true },
      });

      if (!email) {
        console.warn(`[Worker] Email ${emailId} not found in database, skipping`);
        return { status: 'skipped', reason: 'not_found' };
      }

      // 2. Check if already sent or cancelled (idempotency)
      if (email.status === 'SENT') {
        console.log(`[Worker] Email ${emailId} already sent, skipping`);
        return { status: 'skipped', reason: 'already_sent' };
      }

      if (email.status === 'CANCELLED') {
        console.log(`[Worker] Email ${emailId} cancelled, skipping`);
        return { status: 'skipped', reason: 'cancelled' };
      }

      // 3. Check hourly rate limit BEFORE claiming/incrementing attempts
      const withinRateLimit = await checkHourlyRateLimit(
        email.senderId,
        email.sender.hourlyLimit
      );

      if (!withinRateLimit) {
        console.log(`[Worker] Rate limit reached for sender ${email.sender.email}, rescheduling`);

        // Reschedule to next UTC hour window + small jitter to avoid thundering herd
        const nextWindow = new Date();
        nextWindow.setUTCHours(nextWindow.getUTCHours() + 1, 0, 0, Math.floor(Math.random() * 5000));

        await prisma.email.update({
          where: { id: emailId },
          data: { status: 'RATE_LIMITED', scheduledAt: nextWindow },
        });

        await sendSlackRateLimitNotification(
          email.userId,
          email.sender.email,
          email.sender.hourlyLimit,
          1
        );

        await updateEmailStatus(emailId, 'RATE_LIMITED');

        if (token) {
          await job.moveToDelayed(nextWindow.getTime(), token);
          throw new DelayedError();
        }
        return { status: 'rate_limited', rescheduledTo: nextWindow.toISOString() };
      }

      // 4. Check minimum delay BEFORE claiming/incrementing attempts
      const waitMs = await checkMinDelay(email.senderId);
      if (waitMs > 0) {
        console.log(`[Worker] Min delay not met for sender ${email.sender.email}, rescheduling in ${waitMs}ms`);

        const newScheduledAt = new Date(Date.now() + waitMs);
        await prisma.email.update({
          where: { id: emailId },
          data: { status: 'SCHEDULED', scheduledAt: newScheduledAt },
        });

        if (token) {
          await job.moveToDelayed(newScheduledAt.getTime(), token);
          throw new DelayedError();
        }
        return { status: 'delayed', waitMs };
      }

      // 5. Atomically claim email for SMTP delivery
      const claimed = await prisma.email.updateMany({
        where: {
          id: emailId,
          status: { in: ['SCHEDULED', 'QUEUED', 'RATE_LIMITED'] },
        },
        data: { status: 'PROCESSING', attempts: { increment: 1 } },
      });

      if (claimed.count === 0) {
        console.log(`[Worker] Email ${emailId} already claimed or processed, skipping`);
        return { status: 'skipped', reason: 'already_claimed' };
      }

      // 6. Send email via SMTP
      try {
        const fromAddress = config.smtp.from || `${email.sender.name} <${email.sender.email}>`;
        const result = await sendEmail({
          from: fromAddress,
          to: email.recipient,
          subject: email.subject,
          html: email.body,
        });

        // 7. Update email as sent
        const sentAt = new Date();
        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'SENT',
            sentAt,
            messageId: result.messageId,
            lastError: null,
          },
        });

        // 8. Index in Elasticsearch
        await indexEmail({
          emailId,
          userId: email.userId,
          campaignId: email.campaignId,
          recipient: email.recipient,
          recipientName: email.recipientName || undefined,
          sender: email.sender.email,
          subject: email.subject,
          status: 'SENT',
          scheduledAt: email.scheduledAt.toISOString(),
          sentAt: sentAt.toISOString(),
        });

        console.log(`[Worker] Email ${emailId} sent successfully to ${email.recipient}`);
        if (result.previewUrl) {
          console.log(`[Worker] Preview URL: ${result.previewUrl}`);
        }

        // 9. Check if campaign is complete
        const pendingCount = await prisma.email.count({
          where: {
            campaignId: email.campaignId,
            status: { notIn: ['SENT', 'FAILED', 'CANCELLED'] },
          },
        });

        if (pendingCount === 0) {
          await prisma.campaign.update({
            where: { id: email.campaignId },
            data: { status: 'COMPLETED' },
          });
          console.log(`[Worker] Campaign ${email.campaignId} completed`);
        }

        return { status: 'sent', messageId: result.messageId };
      } catch (error) {
        const errorMessage = (error as Error).message;
        console.error(`[Worker] Failed to send email ${emailId}:`, errorMessage);

        const currentAttempts = email.attempts + 1;
        const maxAttempts = 3;

        if (currentAttempts >= maxAttempts) {
          await prisma.email.update({
            where: { id: emailId },
            data: { status: 'FAILED', lastError: errorMessage },
          });
          await updateEmailStatus(emailId, 'FAILED');
          console.error(`[Worker] Email ${emailId} permanently failed after ${currentAttempts} attempts`);
        } else {
          await prisma.email.update({
            where: { id: emailId },
            data: { status: 'SCHEDULED', lastError: errorMessage },
          });
        }

        throw error; // Let BullMQ handle retry with backoff
      }
    },
    {
      connection: createRedisConnection(),
      concurrency: config.worker.concurrency,
      limiter: {
        max: 10,
        duration: 1000,
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[Worker] Worker error:', err.message);
  });

  return worker;
};
