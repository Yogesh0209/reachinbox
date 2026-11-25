import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { config } from '../../config';
import { prisma } from '../../config/prisma';
import { encrypt } from '../../utils/encryption';
import crypto from 'crypto';

const router = Router();

// Store OAuth states in memory (for simplicity; use Redis in production)
const oauthStates = new Map<string, { userId: string; expiresAt: number }>();

// Initiate Slack OAuth
router.get('/connect', authMiddleware, (req: Request, res: Response) => {
  if (!config.slack.clientId || !config.slack.clientSecret) {
    res.status(503).json({ error: 'Slack integration not configured' });
    return;
  }

  const state = crypto.randomBytes(32).toString('hex');
  oauthStates.set(state, {
    userId: req.user!.id,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  const params = new URLSearchParams({
    client_id: config.slack.clientId,
    scope: 'chat:write,channels:read',
    redirect_uri: config.slack.callbackUrl,
    state,
  });

  res.redirect(`https://slack.com/oauth/v2/authorize?${params}`);
});

// Slack OAuth callback
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!state || !oauthStates.has(state as string)) {
      res.redirect(`${config.frontendUrl}/integrations?error=invalid_state`);
      return;
    }

    const stateData = oauthStates.get(state as string)!;
    oauthStates.delete(state as string);

    if (Date.now() > stateData.expiresAt) {
      res.redirect(`${config.frontendUrl}/integrations?error=state_expired`);
      return;
    }

    // Exchange code for token
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.slack.clientId,
        client_secret: config.slack.clientSecret,
        code: code as string,
        redirect_uri: config.slack.callbackUrl,
      }),
    });

    const data = await tokenResponse.json() as any;

    if (!data.ok) {
      res.redirect(`${config.frontendUrl}/integrations?error=token_exchange_failed`);
      return;
    }

    const encryptedToken = encrypt(data.access_token);

    await prisma.slackIntegration.upsert({
      where: { userId: stateData.userId },
      update: {
        encryptedToken,
        teamId: data.team.id,
        teamName: data.team.name,
        connected: true,
      },
      create: {
        userId: stateData.userId,
        encryptedToken,
        teamId: data.team.id,
        teamName: data.team.name,
        connected: true,
      },
    });

    res.redirect(`${config.frontendUrl}/integrations?success=slack_connected`);
  } catch (error) {
    console.error('[Slack] OAuth callback error:', error);
    res.redirect(`${config.frontendUrl}/integrations?error=callback_failed`);
  }
});

// Get Slack status
router.get('/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const integration = await prisma.slackIntegration.findUnique({
      where: { userId: req.user!.id },
      select: { connected: true, teamName: true, teamId: true, createdAt: true },
    });

    res.json({
      connected: integration?.connected || false,
      teamName: integration?.teamName || null,
      teamId: integration?.teamId || null,
      connectedAt: integration?.createdAt || null,
      configured: !!(config.slack.clientId && config.slack.clientSecret),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get Slack status' });
  }
});

// Disconnect Slack
router.post('/disconnect', authMiddleware, async (req: Request, res: Response) => {
  try {
    await prisma.slackIntegration.updateMany({
      where: { userId: req.user!.id },
      data: { connected: false },
    });

    res.json({ message: 'Slack disconnected' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to disconnect Slack' });
  }
});

export default router;
