import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { prisma } from '../../config/prisma';
import { searchEmails as esSearch, indexEmail } from '../../services/search';
import multer from 'multer';
import { parseRecipientFile } from '../../utils/email-validator';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Get email stats
router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const statuses = await prisma.email.groupBy({
      by: ['status'],
      where: { userId },
      _count: true,
    });

    const stats = {
      total: 0,
      scheduled: 0,
      sent: 0,
      failed: 0,
      processing: 0,
      rateLimited: 0,
      cancelled: 0,
    };

    statuses.forEach((s) => {
      stats.total += s._count;
      switch (s.status) {
        case 'SCHEDULED': case 'QUEUED': stats.scheduled += s._count; break;
        case 'SENT': stats.sent += s._count; break;
        case 'FAILED': stats.failed += s._count; break;
        case 'PROCESSING': stats.processing += s._count; break;
        case 'RATE_LIMITED': stats.rateLimited += s._count; break;
        case 'CANCELLED': stats.cancelled += s._count; break;
      }
    });

    res.json({ stats });
  } catch (error) {
    console.error('[Emails] Stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// List emails with filters
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;
    const status = req.query.status as string;
    const campaignId = req.query.campaignId as string;
    const sort = (req.query.sort as string) || 'scheduledAt';
    const order = (req.query.order as string) || 'desc';

    const where: any = { userId };
    if (status) where.status = status;
    if (campaignId) where.campaignId = campaignId;

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        orderBy: { [sort]: order },
        skip,
        take: limit,
        include: {
          sender: { select: { name: true, email: true } },
          campaign: { select: { name: true } },
        },
      }),
      prisma.email.count({ where }),
    ]);

    res.json({
      emails,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[Emails] List error:', error);
    res.status(500).json({ error: 'Failed to list emails' });
  }
});

// Scheduled emails
router.get('/scheduled', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    const where = { userId, status: { in: ['SCHEDULED' as const, 'QUEUED' as const, 'RATE_LIMITED' as const] } };

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        orderBy: { scheduledAt: 'asc' },
        skip,
        take: limit,
        include: {
          sender: { select: { name: true, email: true } },
          campaign: { select: { name: true } },
        },
      }),
      prisma.email.count({ where }),
    ]);

    res.json({ emails, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list scheduled emails' });
  }
});

// Sent emails
router.get('/sent', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    const where = { userId, status: 'SENT' as const };

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
        include: {
          sender: { select: { name: true, email: true } },
          campaign: { select: { name: true } },
        },
      }),
      prisma.email.count({ where }),
    ]);

    res.json({ emails, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list sent emails' });
  }
});

// Failed emails
router.get('/failed', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    const where = { userId, status: 'FAILED' as const };

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          sender: { select: { name: true, email: true } },
          campaign: { select: { name: true } },
        },
      }),
      prisma.email.count({ where }),
    ]);

    res.json({ emails, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list failed emails' });
  }
});

// Search emails
router.get('/search', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const q = req.query.q as string;
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    if (!q || q.trim().length === 0) {
      res.status(400).json({ error: 'Search query is required' });
      return;
    }

    // Try Elasticsearch first
    const esResults = await esSearch(userId, q, status, (page - 1) * limit, limit);

    if (esResults.total > 0) {
      res.json({
        emails: esResults.hits,
        pagination: { page, limit, total: esResults.total, pages: Math.ceil(esResults.total / limit) },
        source: 'elasticsearch',
      });
      return;
    }

    // Fallback to PostgreSQL search
    const where: any = {
      userId,
      OR: [
        { recipient: { contains: q, mode: 'insensitive' } },
        { subject: { contains: q, mode: 'insensitive' } },
        { campaign: { name: { contains: q, mode: 'insensitive' } } },
      ],
    };
    if (status) where.status = status;

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        orderBy: { scheduledAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          sender: { select: { name: true, email: true } },
          campaign: { select: { name: true } },
        },
      }),
      prisma.email.count({ where }),
    ]);

    res.json({
      emails,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      source: 'postgresql',
    });
  } catch (error) {
    console.error('[Emails] Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Upload recipients file
router.post('/upload-recipients', authMiddleware, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const filename = req.file.originalname;
    const content = req.file.buffer.toString('utf-8');
    const result = parseRecipientFile(content, filename);

    res.json({
      valid: result.valid,
      invalid: result.invalid,
      validCount: result.valid.length,
      invalidCount: result.invalid.length,
      duplicatesRemoved: result.duplicatesRemoved,
    });
  } catch (error) {
    console.error('[Emails] Upload error:', error);
    res.status(500).json({ error: 'Failed to parse file' });
  }
});

// Reindex emails in Elasticsearch
router.post('/reindex', authMiddleware, async (req: Request, res: Response) => {
  try {
    const emails = await prisma.email.findMany({
      where: { userId: req.user!.id },
      include: { sender: { select: { email: true } } },
    });

    let indexed = 0;
    for (const email of emails) {
      await indexEmail({
        emailId: email.id,
        userId: email.userId,
        campaignId: email.campaignId,
        recipient: email.recipient,
        recipientName: email.recipientName || undefined,
        sender: email.sender.email,
        subject: email.subject,
        status: email.status,
        scheduledAt: email.scheduledAt.toISOString(),
        sentAt: email.sentAt ? email.sentAt.toISOString() : undefined,
      });
      indexed++;
    }

    res.json({ message: 'Reindex completed', indexed });
  } catch (error) {
    console.error('[Emails] Reindex error:', error);
    res.status(500).json({ error: 'Failed to reindex emails' });
  }
});

export default router;
