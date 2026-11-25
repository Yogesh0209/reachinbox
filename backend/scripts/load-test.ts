/**
 * Load Test Script — Creates 1000 scheduled email jobs
 * Usage: npx tsx scripts/load-test.ts
 *
 * This creates a campaign with 1000 recipients in dry-run mode.
 * No real SMTP emails are sent unless SMTP is configured.
 */

import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { v5 as uuidv5 } from 'uuid';

const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

async function main() {
  const prisma = new PrismaClient();
  const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });
  const queue = new Queue('email-queue', { connection: redis });

  console.log('=== ReachInbox Load Test ===');
  console.log('Creating 1000 scheduled email jobs...');

  // Find or create user
  const user = await prisma.user.upsert({
    where: { email: 'loadtest@reachinbox.dev' },
    update: {},
    create: { name: 'Load Test User', email: 'loadtest@reachinbox.dev' },
  });

  // Create sender
  const sender = await prisma.sender.upsert({
    where: { userId_email: { userId: user.id, email: 'sender@loadtest.dev' } },
    update: {},
    create: { userId: user.id, name: 'Load Test Sender', email: 'sender@loadtest.dev', hourlyLimit: 100, delaySeconds: 2 },
  });

  // Create campaign
  const startAt = new Date(Date.now() + 60000);
  const campaign = await prisma.campaign.create({
    data: {
      userId: user.id,
      name: `Load Test - ${new Date().toISOString()}`,
      subject: 'Load Test Email',
      body: '<p>This is a load test email from ReachInbox.</p>',
      startAt,
      delaySeconds: 2,
      hourlyLimit: 100,
      totalRecipients: 1000,
      status: 'RUNNING',
    },
  });

  console.log(`Campaign created: ${campaign.id}`);

  // Create 1000 email records
  const emailsData = Array.from({ length: 1000 }, (_, i) => {
    const recipient = `recipient-${String(i + 1).padStart(4, '0')}@test.example.com`;
    const scheduledAt = new Date(startAt.getTime() + i * 2000);
    return {
      campaignId: campaign.id,
      senderId: sender.id,
      userId: user.id,
      recipient,
      subject: 'Load Test Email',
      body: '<p>This is a load test email from ReachInbox.</p>',
      scheduledAt,
      status: 'SCHEDULED' as const,
      idempotencyKey: uuidv5(`${campaign.id}:${recipient}:${i}`, NAMESPACE),
    };
  });

  await prisma.email.createMany({ data: emailsData });
  console.log('1000 email records created in database');

  // Schedule BullMQ jobs
  const emails = await prisma.email.findMany({
    where: { campaignId: campaign.id },
    orderBy: { scheduledAt: 'asc' },
  });

  let scheduled = 0;
  for (const email of emails) {
    const delay = Math.max(0, email.scheduledAt.getTime() - Date.now());
    await queue.add('send-email', { emailId: email.id }, {
      jobId: `send-email-${email.id}`,
      delay,
      removeOnComplete: { age: 3600 * 24 },
      removeOnFail: { age: 3600 * 24 * 7 },
    });
    scheduled++;
    if (scheduled % 100 === 0) {
      console.log(`Scheduled ${scheduled}/1000 jobs...`);
    }
  }

  console.log('\n=== Load Test Complete ===');
  console.log(`Campaign: ${campaign.id}`);
  console.log(`Emails: ${emails.length}`);
  console.log(`Jobs Scheduled: ${scheduled}`);
  console.log('\nCheck Bull Board at http://localhost:3001/admin/queues');

  await prisma.$disconnect();
  await redis.quit();
}

main().catch(console.error);
