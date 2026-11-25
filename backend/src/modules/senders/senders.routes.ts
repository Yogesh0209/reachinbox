import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { prisma } from '../../config/prisma';

const router = Router();

const senderSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  hourlyLimit: z.number().int().min(1).max(10000).default(100),
  delaySeconds: z.number().int().min(1).max(3600).default(2),
});

const updateSenderSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  hourlyLimit: z.number().int().min(1).max(10000).optional(),
  delaySeconds: z.number().int().min(1).max(3600).optional(),
});

// List senders for current user
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const senders = await prisma.sender.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { emails: true } },
      },
    });
    res.json({ senders });
  } catch (error) {
    console.error('[Senders] List error:', error);
    res.status(500).json({ error: 'Failed to list senders' });
  }
});

// Create or upsert sender
router.post('/', authMiddleware, validate(senderSchema), async (req: Request, res: Response) => {
  try {
    const data = senderSchema.parse(req.body);
    const sender = await prisma.sender.upsert({
      where: { userId_email: { userId: req.user!.id, email: data.email.toLowerCase() } },
      update: {
        name: data.name,
        hourlyLimit: data.hourlyLimit,
        delaySeconds: data.delaySeconds,
      },
      create: {
        userId: req.user!.id,
        name: data.name,
        email: data.email.toLowerCase(),
        hourlyLimit: data.hourlyLimit,
        delaySeconds: data.delaySeconds,
      },
    });
    res.status(201).json({ sender });
  } catch (error) {
    console.error('[Senders] Create error:', error);
    res.status(500).json({ error: 'Failed to create sender' });
  }
});

// Update sender settings
router.put('/:id', authMiddleware, validate(updateSenderSchema), async (req: Request, res: Response) => {
  try {
    const existing = await prisma.sender.findFirst({
      where: { id: String(req.params.id), userId: req.user!.id },
    });
    if (!existing) {
      res.status(404).json({ error: 'Sender not found' });
      return;
    }

    const data = updateSenderSchema.parse(req.body);
    const sender = await prisma.sender.update({
      where: { id: existing.id },
      data,
    });
    res.json({ sender });
  } catch (error) {
    console.error('[Senders] Update error:', error);
    res.status(500).json({ error: 'Failed to update sender' });
  }
});

export default router;
