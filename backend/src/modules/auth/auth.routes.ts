import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { prisma } from '../../config/prisma';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

const createToken = (userId: string): string => {
  return jwt.sign({ userId }, config.session.secret, { expiresIn: '7d' });
};

const setTokenCookie = (res: Response, token: string): void => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
};

// Google OAuth redirect
router.get('/google', (req: Request, res: Response) => {
  if (!config.google.clientId || !config.google.clientSecret) {
    res.status(503).json({ error: 'Google OAuth not configured' });
    return;
  }
  const params = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: config.google.callbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// Google OAuth callback
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;
    if (!code) {
      res.redirect(`${config.frontendUrl}/login?error=no_code`);
      return;
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: config.google.clientId,
        client_secret: config.google.clientSecret,
        redirect_uri: config.google.callbackUrl,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json() as any;
    if (!tokens.access_token) {
      res.redirect(`${config.frontendUrl}/login?error=token_exchange_failed`);
      return;
    }

    // Get user info
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userInfoResponse.json() as any;

    // Create or update user
    const user = await prisma.user.upsert({
      where: { googleId: userInfo.id },
      update: {
        name: userInfo.name,
        email: userInfo.email,
        avatar: userInfo.picture,
      },
      create: {
        googleId: userInfo.id,
        name: userInfo.name,
        email: userInfo.email,
        avatar: userInfo.picture,
      },
    });

    const token = createToken(user.id);
    setTokenCookie(res, token);
    res.redirect(config.frontendUrl);
  } catch (error) {
    console.error('[Auth] Google OAuth error:', error);
    res.redirect(`${config.frontendUrl}/login?error=oauth_failed`);
  }
});

// Development-only login
router.post('/dev-login', async (req: Request, res: Response) => {
  if (!config.devAuth.enabled) {
    res.status(403).json({ error: 'Development login is disabled' });
    return;
  }

  const { name, email } = req.body;
  if (!name || !email) {
    res.status(400).json({ error: 'Name and email are required' });
    return;
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { name },
    create: { name, email, avatar: null },
  });

  const token = createToken(user.id);
  setTokenCookie(res, token);
  res.json({
    user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar },
    token,
  });
});

// Get current user
router.get('/me', authMiddleware, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

// Logout
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('token', { path: '/' });
  res.json({ message: 'Logged out successfully' });
});

// Check OAuth availability
router.get('/providers', (req: Request, res: Response) => {
  res.json({
    google: !!(config.google.clientId && config.google.clientSecret),
    devLogin: config.devAuth.enabled,
  });
});

export default router;
