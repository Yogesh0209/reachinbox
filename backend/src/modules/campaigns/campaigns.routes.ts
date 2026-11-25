import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { prisma } from '../../config/prisma';
import { generateIdempotencyKey } from '../../utils/idempotency';
import { scheduleEmailJob } from '../../queue/email-queue';
import { indexEmail } from '../../services/search';

const router = Router();

const createCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  subject: z.string().min(1).max(500),
  body: z.string().min(1),
  senderName: z.string().min(1).max(200),
  senderEmail: z.string().email(),
  recipients: z.array(z.string().email()).min(1).max(10000),
  startAt: z.string().datetime().or(z.string()),
  delaySeconds: z.number().min(2).max(3600).default(2),
  hourlyLimit: z.number().min(1).max(1000).default(100),
});

// Create campaign
router.post('/', authMiddleware, validate(createCampaignSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = createCampaignSchema.parse(req.body);

    // Deduplicate recipients
    const uniqueRecipients = [...new Set(data.recipients.map((r) => r.toLowerCase()))];

    // Create or find sender (normalized email)
    const senderEmailNormalized = data.senderEmail.toLowerCase().trim();
    const sender = await prisma.sender.upsert({
      where: { userId_email: { userId, email: senderEmailNormalized } },
      update: { name: data.senderName, hourlyLimit: data.hourlyLimit, delaySeconds: data.delaySeconds },
      create: {
        userId,
        name: data.senderName,
        email: senderEmailNormalized,
        hourlyLimit: data.hourlyLimit,
        delaySeconds: data.delaySeconds,
      },
    });

    const startAt = new Date(data.startAt);

    // Create campaign and emails in a transaction
    const campaign = await prisma.$transaction(async (tx) => {
      const camp = await tx.campaign.create({
        data: {
          userId,
          name: data.name,
          subject: data.subject,
          body: data.body,
          startAt,
          delaySeconds: data.delaySeconds,
          hourlyLimit: data.hourlyLimit,
          totalRecipients: uniqueRecipients.length,
          status: 'SCHEDULED',
        },
      });

      // Create email records
      const emailsData = uniqueRecipients.map((recipient, index) => {
        const scheduledAt = new Date(startAt.getTime() + index * data.delaySeconds * 1000);
        return {
          campaignId: camp.id,
          senderId: sender.id,
          userId,
          recipient,
          subject: data.subject,
          body: data.body,
          scheduledAt,
          status: 'SCHEDULED' as const,
          idempotencyKey: generateIdempotencyKey(camp.id, recipient, index),
        };
      });

      await tx.email.createMany({ data: emailsData });

      return camp;
    });

    // Fetch created emails and schedule BullMQ jobs
    const emails = await prisma.email.findMany({
      where: { campaignId: campaign.id },
      orderBy: { scheduledAt: 'asc' },
    });

    // Schedule jobs (outside transaction for Redis operations)
    for (const email of emails) {
      await scheduleEmailJob(email.id, email.scheduledAt);

      // Index in Elasticsearch
      indexEmail({
        emailId: email.id,
        userId,
        campaignId: campaign.id,
        recipient: email.recipient,
        sender: sender.email,
        subject: email.subject,
        status: 'SCHEDULED',
        scheduledAt: email.scheduledAt.toISOString(),
      }).catch(() => {}); // Non-blocking
    }

    // Update campaign status
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'RUNNING' },
    });

    res.status(201).json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: 'RUNNING',
        totalRecipients: uniqueRecipients.length,
        startAt: campaign.startAt,
      },
      emailsScheduled: emails.length,
    });
  } catch (error) {
    console.error('[Campaigns] Create error:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// List campaigns
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: {
            select: { emails: true },
          },
        },
      }),
      prisma.campaign.count({ where: { userId } }),
    ]);

    // Get email status counts for each campaign
    const campaignsWithStats = await Promise.all(
      campaigns.map(async (c) => {
        const statuses = await prisma.email.groupBy({
          by: ['status'],
          where: { campaignId: c.id },
          _count: true,
        });
        const stats = Object.fromEntries(statuses.map((s) => [s.status, s._count]));
        return { ...c, emailStats: stats };
      })
    );

    res.json({
      campaigns: campaignsWithStats,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[Campaigns] List error:', error);
    res.status(500).json({ error: 'Failed to list campaigns' });
  }
});

// Get campaign by ID
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id: String(req.params.id), userId: req.user!.id },
      include: {
        emails: {
          orderBy: { scheduledAt: 'asc' },
          take: 100,
          include: { sender: { select: { name: true, email: true } } },
        },
        _count: { select: { emails: true } },
      },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    const statuses = await prisma.email.groupBy({
      by: ['status'],
      where: { campaignId: campaign.id },
      _count: true,
    });

    res.json({
      campaign,
      emailStats: Object.fromEntries(statuses.map((s) => [s.status, s._count])),
    });
  } catch (error) {
    console.error('[Campaigns] Get error:', error);
    res.status(500).json({ error: 'Failed to get campaign' });
  }
});

// Delete campaign
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id: String(req.params.id), userId: req.user!.id },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    // Cancel pending emails
    await prisma.email.updateMany({
      where: {
        campaignId: campaign.id,
        status: { in: ['SCHEDULED', 'QUEUED', 'RATE_LIMITED'] },
      },
      data: { status: 'CANCELLED' },
    });

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'FAILED' },
    });

    res.json({ message: 'Campaign cancelled' });
  } catch (error) {
    console.error('[Campaigns] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

export default router;
