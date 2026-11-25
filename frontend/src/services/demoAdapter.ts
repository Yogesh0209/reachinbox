import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { Campaign, Email, SlackStatus, User } from '../types';

export const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const STORAGE_KEY = 'reachinbox_demo_state_v1';
const AUTH_KEY = 'reachinbox_demo_logged_in';

const DEMO_USER: User = {
  id: 'demo-user-1',
  name: 'Demo User',
  email: 'demo@reachinbox.ai',
  avatar: null,
};

interface DemoState {
  campaigns: Campaign[];
  emails: Email[];
  slack: SlackStatus;
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function createSeedState(): DemoState {
  const now = Date.now();
  const min = 60 * 1000;
  const hr = 60 * min;

  const campaigns: Campaign[] = [
    {
      id: 'camp-demo-1',
      userId: DEMO_USER.id,
      name: 'Q4 Enterprise Outreach',
      subject: 'Scaling outbound deliverability at {{company}}',
      body: '<p>Hi there,</p><p>Wanted to share how teams automate outreach with sender-level rate limits.</p>',
      startAt: new Date(now - 2 * hr).toISOString(),
      delaySeconds: 15,
      hourlyLimit: 100,
      totalRecipients: 8,
      status: 'RUNNING',
      createdAt: new Date(now - 3 * hr).toISOString(),
      updatedAt: new Date(now - 10 * min).toISOString(),
    },
    {
      id: 'camp-demo-2',
      userId: DEMO_USER.id,
      name: 'Product Launch Waitlist',
      subject: 'Early access to ReachInbox Scheduler v2',
      body: '<p>Thanks for joining our waitlist! Your workspace invite is ready.</p>',
      startAt: new Date(now - 24 * hr).toISOString(),
      delaySeconds: 10,
      hourlyLimit: 150,
      totalRecipients: 5,
      status: 'COMPLETED',
      createdAt: new Date(now - 25 * hr).toISOString(),
      updatedAt: new Date(now - 20 * hr).toISOString(),
    },
    {
      id: 'camp-demo-3',
      userId: DEMO_USER.id,
      name: 'Founder Webinar Follow-Up',
      subject: 'Recording + slides from yesterday’s session',
      body: '<p>Here is the recording and architecture checklist from the session.</p>',
      startAt: new Date(now + 15 * min).toISOString(),
      delaySeconds: 5,
      hourlyLimit: 80,
      totalRecipients: 5,
      status: 'SCHEDULED',
      createdAt: new Date(now - 30 * min).toISOString(),
      updatedAt: new Date(now - 30 * min).toISOString(),
    },
  ];

  const senderAlex = { name: 'Alex Rivera', email: 'alex@outboxlabs.io' };
  const senderSarah = { name: 'Sarah Chen', email: 'sarah@outboxlabs.io' };

  const emails: Email[] = [
    // Scheduled / Rate-limited for Camp 1 & Camp 3
    {
      id: 'email-demo-1',
      campaignId: 'camp-demo-1',
      senderId: 'sender-1',
      userId: DEMO_USER.id,
      recipient: 'elena.rostova@acme-corp.io',
      recipientName: 'Elena Rostova',
      subject: 'Scaling outbound deliverability at Acme',
      body: campaigns[0].body,
      scheduledAt: new Date(now + 4 * min).toISOString(),
      sentAt: null,
      status: 'SCHEDULED',
      attempts: 0,
      lastError: null,
      messageId: null,
      createdAt: new Date(now - 2 * hr).toISOString(),
      sender: senderAlex,
      campaign: { name: campaigns[0].name },
    },
    {
      id: 'email-demo-2',
      campaignId: 'camp-demo-1',
      senderId: 'sender-1',
      userId: DEMO_USER.id,
      recipient: 'marcus.vance@linearflow.dev',
      recipientName: 'Marcus Vance',
      subject: 'Scaling outbound deliverability at LinearFlow',
      body: campaigns[0].body,
      scheduledAt: new Date(now + 8 * min).toISOString(),
      sentAt: null,
      status: 'SCHEDULED',
      attempts: 0,
      lastError: null,
      messageId: null,
      createdAt: new Date(now - 2 * hr).toISOString(),
      sender: senderAlex,
      campaign: { name: campaigns[0].name },
    },
    {
      id: 'email-demo-3',
      campaignId: 'camp-demo-1',
      senderId: 'sender-1',
      userId: DEMO_USER.id,
      recipient: 'priya.nair@cloudscale.ai',
      recipientName: 'Priya Nair',
      subject: 'Scaling outbound deliverability at CloudScale',
      body: campaigns[0].body,
      scheduledAt: new Date(now + 60 * min).toISOString(),
      sentAt: null,
      status: 'RATE_LIMITED',
      attempts: 0,
      lastError: null,
      messageId: null,
      createdAt: new Date(now - 2 * hr).toISOString(),
      sender: senderAlex,
      campaign: { name: campaigns[0].name },
    },
    {
      id: 'email-demo-4',
      campaignId: 'camp-demo-3',
      senderId: 'sender-2',
      userId: DEMO_USER.id,
      recipient: 'daniel.kim@finops.co',
      recipientName: 'Daniel Kim',
      subject: 'Recording + slides from yesterday’s session',
      body: campaigns[2].body,
      scheduledAt: new Date(now + 15 * min).toISOString(),
      sentAt: null,
      status: 'SCHEDULED',
      attempts: 0,
      lastError: null,
      messageId: null,
      createdAt: new Date(now - 30 * min).toISOString(),
      sender: senderSarah,
      campaign: { name: campaigns[2].name },
    },
    {
      id: 'email-demo-5',
      campaignId: 'camp-demo-3',
      senderId: 'sender-2',
      userId: DEMO_USER.id,
      recipient: 'sofia.martinez@verve.io',
      recipientName: 'Sofia Martinez',
      subject: 'Recording + slides from yesterday’s session',
      body: campaigns[2].body,
      scheduledAt: new Date(now + 16 * min).toISOString(),
      sentAt: null,
      status: 'SCHEDULED',
      attempts: 0,
      lastError: null,
      messageId: null,
      createdAt: new Date(now - 30 * min).toISOString(),
      sender: senderSarah,
      campaign: { name: campaigns[2].name },
    },
    {
      id: 'email-demo-6',
      campaignId: 'camp-demo-3',
      senderId: 'sender-2',
      userId: DEMO_USER.id,
      recipient: 'liam.oconnor@northstar.vc',
      recipientName: "Liam O'Connor",
      subject: 'Recording + slides from yesterday’s session',
      body: campaigns[2].body,
      scheduledAt: new Date(now + 17 * min).toISOString(),
      sentAt: null,
      status: 'QUEUED',
      attempts: 0,
      lastError: null,
      messageId: null,
      createdAt: new Date(now - 30 * min).toISOString(),
      sender: senderSarah,
      campaign: { name: campaigns[2].name },
    },

    // Sent emails
    {
      id: 'email-demo-7',
      campaignId: 'camp-demo-1',
      senderId: 'sender-1',
      userId: DEMO_USER.id,
      recipient: 'hannah.abbott@orbittech.com',
      recipientName: 'Hannah Abbott',
      subject: 'Scaling outbound deliverability at OrbitTech',
      body: campaigns[0].body,
      scheduledAt: new Date(now - 90 * min).toISOString(),
      sentAt: new Date(now - 89 * min).toISOString(),
      status: 'SENT',
      attempts: 1,
      lastError: null,
      messageId: '<sim-001@demo.reachinbox.ai>',
      createdAt: new Date(now - 2 * hr).toISOString(),
      sender: senderAlex,
      campaign: { name: campaigns[0].name },
    },
    {
      id: 'email-demo-8',
      campaignId: 'camp-demo-1',
      senderId: 'sender-1',
      userId: DEMO_USER.id,
      recipient: 'noah.patel@metricwave.io',
      recipientName: 'Noah Patel',
      subject: 'Scaling outbound deliverability at MetricWave',
      body: campaigns[0].body,
      scheduledAt: new Date(now - 75 * min).toISOString(),
      sentAt: new Date(now - 74 * min).toISOString(),
      status: 'SENT',
      attempts: 1,
      lastError: null,
      messageId: '<sim-002@demo.reachinbox.ai>',
      createdAt: new Date(now - 2 * hr).toISOString(),
      sender: senderAlex,
      campaign: { name: campaigns[0].name },
    },
    {
      id: 'email-demo-9',
      campaignId: 'camp-demo-2',
      senderId: 'sender-2',
      userId: DEMO_USER.id,
      recipient: 'claire.dupont@atelier.fr',
      recipientName: 'Claire Dupont',
      subject: 'Early access to ReachInbox Scheduler v2',
      body: campaigns[1].body,
      scheduledAt: new Date(now - 22 * hr).toISOString(),
      sentAt: new Date(now - 22 * hr + 3000).toISOString(),
      status: 'SENT',
      attempts: 1,
      lastError: null,
      messageId: '<sim-003@demo.reachinbox.ai>',
      createdAt: new Date(now - 24 * hr).toISOString(),
      sender: senderSarah,
      campaign: { name: campaigns[1].name },
    },
    {
      id: 'email-demo-10',
      campaignId: 'camp-demo-2',
      senderId: 'sender-2',
      userId: DEMO_USER.id,
      recipient: 'kenji.sato@nexuslabs.jp',
      recipientName: 'Kenji Sato',
      subject: 'Early access to ReachInbox Scheduler v2',
      body: campaigns[1].body,
      scheduledAt: new Date(now - 21 * hr).toISOString(),
      sentAt: new Date(now - 21 * hr + 4000).toISOString(),
      status: 'SENT',
      attempts: 1,
      lastError: null,
      messageId: '<sim-004@demo.reachinbox.ai>',
      createdAt: new Date(now - 24 * hr).toISOString(),
      sender: senderSarah,
      campaign: { name: campaigns[1].name },
    },
    {
      id: 'email-demo-11',
      campaignId: 'camp-demo-2',
      senderId: 'sender-2',
      userId: DEMO_USER.id,
      recipient: 'olivia.grant@harbor.dev',
      recipientName: 'Olivia Grant',
      subject: 'Early access to ReachInbox Scheduler v2',
      body: campaigns[1].body,
      scheduledAt: new Date(now - 20 * hr).toISOString(),
      sentAt: new Date(now - 20 * hr + 2000).toISOString(),
      status: 'SENT',
      attempts: 1,
      lastError: null,
      messageId: '<sim-005@demo.reachinbox.ai>',
      createdAt: new Date(now - 24 * hr).toISOString(),
      sender: senderSarah,
      campaign: { name: campaigns[1].name },
    },

    // Failed emails
    {
      id: 'email-demo-12',
      campaignId: 'camp-demo-1',
      senderId: 'sender-1',
      userId: DEMO_USER.id,
      recipient: 'bounce@invalid-domain-test.org',
      recipientName: null,
      subject: 'Scaling outbound deliverability',
      body: campaigns[0].body,
      scheduledAt: new Date(now - 60 * min).toISOString(),
      sentAt: null,
      status: 'FAILED',
      attempts: 3,
      lastError: 'SMTP 550 5.1.1: The email account does not exist (simulated)',
      messageId: null,
      createdAt: new Date(now - 2 * hr).toISOString(),
      sender: senderAlex,
      campaign: { name: campaigns[0].name },
    },
    {
      id: 'email-demo-13',
      campaignId: 'camp-demo-2',
      senderId: 'sender-2',
      userId: DEMO_USER.id,
      recipient: 'legacy-mx@timeout-corp.net',
      recipientName: null,
      subject: 'Early access to ReachInbox Scheduler v2',
      body: campaigns[1].body,
      scheduledAt: new Date(now - 21 * hr).toISOString(),
      sentAt: null,
      status: 'FAILED',
      attempts: 3,
      lastError: 'Connection timeout after 3 retries to mx.timeout-corp.net:587 (simulated)',
      messageId: null,
      createdAt: new Date(now - 24 * hr).toISOString(),
      sender: senderSarah,
      campaign: { name: campaigns[1].name },
    },
  ];

  return {
    campaigns,
    emails,
    slack: {
      connected: true,
      teamName: 'Outbox Labs Workspace (Demo)',
      teamId: 'T0DEMO123',
      connectedAt: new Date(now - 48 * hr).toISOString(),
      configured: true,
    },
  };
}

function loadState(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DemoState;
  } catch { /* ignore */ }
  const seed = createSeedState();
  saveState(seed);
  return seed;
}

function saveState(state: DemoState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function parseRecipientContent(content: string, filename: string) {
  const isCSV = filename.toLowerCase().endsWith('.csv');
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { valid: [], invalid: [], duplicatesRemoved: 0 };

  const firstLine = lines[0].toLowerCase();
  const hasHeader = isCSV && (firstLine.includes('email') || firstLine.includes('mail') || firstLine.includes('address'));
  const startIdx = hasHeader ? 1 : 0;

  const all: string[] = [];
  const invalid: string[] = [];

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
    let found = false;
    for (const part of parts) {
      if (EMAIL_REGEX.test(part)) {
        all.push(part.toLowerCase());
        found = true;
        break;
      }
    }
    if (!found && line.length > 0) invalid.push(line);
  }

  const valid = [...new Set(all)];
  return { valid, invalid, duplicatesRemoved: all.length - valid.length };
}

function respond(config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse {
  return { data, status, statusText: 'OK', headers: {}, config };
}

function paginate<T>(items: T[], page: number, limit: number) {
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const slice = items.slice((page - 1) * limit, page * limit);
  return { items: slice, pagination: { page, limit, total, pages } };
}

export const demoAdapter: AxiosAdapter = async (reqConfig) => {
  await new Promise((r) => setTimeout(r, 80));

  const method = (reqConfig.method || 'get').toUpperCase();
  const rawUrl = (reqConfig.url || '').replace(/^\/api/, '');
  const [path, queryString] = rawUrl.split('?');
  const params = new URLSearchParams(queryString || '');
  const body = typeof reqConfig.data === 'string' ? JSON.parse(reqConfig.data) : reqConfig.data;

  // Auth routes
  if (method === 'GET' && path === '/auth/providers') {
    return respond(reqConfig, { google: false, devLogin: false, demoMode: true });
  }

  if (method === 'POST' && (path === '/auth/demo-login' || path === '/auth/dev-login')) {
    localStorage.setItem(AUTH_KEY, '1');
    loadState(); // ensure seed data exists
    return respond(reqConfig, { user: DEMO_USER, token: 'demo-session-token' });
  }

  if (method === 'POST' && path === '/auth/logout') {
    localStorage.removeItem(AUTH_KEY);
    return respond(reqConfig, { message: 'Logged out' });
  }

  if (method === 'GET' && path === '/auth/me') {
    if (localStorage.getItem(AUTH_KEY) !== '1') {
      return Promise.reject({ response: { status: 401, data: { error: 'Not authenticated' } } });
    }
    return respond(reqConfig, { user: DEMO_USER });
  }

  const state = loadState();

  // Email stats
  if (method === 'GET' && path === '/emails/stats') {
    const stats = {
      total: state.emails.length,
      scheduled: state.emails.filter((e) => ['SCHEDULED', 'QUEUED'].includes(e.status)).length,
      sent: state.emails.filter((e) => e.status === 'SENT').length,
      failed: state.emails.filter((e) => e.status === 'FAILED').length,
      processing: state.emails.filter((e) => e.status === 'PROCESSING').length,
      rateLimited: state.emails.filter((e) => e.status === 'RATE_LIMITED').length,
      cancelled: state.emails.filter((e) => e.status === 'CANCELLED').length,
    };
    return respond(reqConfig, { stats });
  }

  // Email lists & search
  const page = parseInt(params.get('page') || '1', 10);
  const limit = parseInt(params.get('limit') || '20', 10);

  if (method === 'GET' && path === '/emails/scheduled') {
    const list = state.emails
      .filter((e) => ['SCHEDULED', 'QUEUED', 'RATE_LIMITED'].includes(e.status))
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    const p = paginate(list, page, limit);
    return respond(reqConfig, { emails: p.items, pagination: p.pagination });
  }

  if (method === 'GET' && path === '/emails/sent') {
    const list = state.emails
      .filter((e) => e.status === 'SENT')
      .sort((a, b) => new Date(b.sentAt || b.scheduledAt).getTime() - new Date(a.sentAt || a.scheduledAt).getTime());
    const p = paginate(list, page, limit);
    return respond(reqConfig, { emails: p.items, pagination: p.pagination });
  }

  if (method === 'GET' && path === '/emails/failed') {
    const list = state.emails.filter((e) => e.status === 'FAILED');
    const p = paginate(list, page, limit);
    return respond(reqConfig, { emails: p.items, pagination: p.pagination });
  }

  if (method === 'GET' && path === '/emails/search') {
    const q = (params.get('q') || '').toLowerCase().trim();
    const statusFilter = params.get('status');
    const list = state.emails.filter((e) => {
      const matchText =
        e.recipient.toLowerCase().includes(q) ||
        e.subject.toLowerCase().includes(q) ||
        (e.sender?.email || '').toLowerCase().includes(q) ||
        (e.campaign?.name || '').toLowerCase().includes(q);
      const matchStatus = !statusFilter || e.status === statusFilter;
      return matchText && matchStatus;
    });
    const p = paginate(list, page, limit);
    return respond(reqConfig, { emails: p.items, pagination: p.pagination, source: 'demo' });
  }

  if (method === 'GET' && path === '/emails') {
    const p = paginate(state.emails, page, limit);
    return respond(reqConfig, { emails: p.items, pagination: p.pagination });
  }

  // Upload recipients CSV/TXT
  if (method === 'POST' && path === '/emails/upload-recipients') {
    const formData = reqConfig.data as FormData;
    const file = formData?.get('file') as File | null;
    if (!file) {
      return Promise.reject({ response: { status: 400, data: { error: 'No file uploaded' } } });
    }
    const text = await file.text();
    const parsed = parseRecipientContent(text, file.name);
    return respond(reqConfig, {
      valid: parsed.valid,
      invalid: parsed.invalid,
      validCount: parsed.valid.length,
      invalidCount: parsed.invalid.length,
      duplicatesRemoved: parsed.duplicatesRemoved,
    });
  }

  // Campaigns
  if (method === 'GET' && path === '/campaigns') {
    const p = paginate(state.campaigns, page, limit);
    return respond(reqConfig, { campaigns: p.items, pagination: p.pagination });
  }

  if (method === 'POST' && path === '/campaigns') {
    const campId = `camp-demo-${Date.now()}`;
    const startAtMs = new Date(body.startAt).getTime();
    const delaySec = Number(body.delaySeconds) || 2;
    const recipients: string[] = [...new Set((body.recipients as string[]).map((r) => r.toLowerCase()))];

    const newCampaign: Campaign = {
      id: campId,
      userId: DEMO_USER.id,
      name: body.name,
      subject: body.subject,
      body: body.body,
      startAt: new Date(startAtMs).toISOString(),
      delaySeconds: delaySec,
      hourlyLimit: Number(body.hourlyLimit) || 100,
      totalRecipients: recipients.length,
      status: 'RUNNING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newEmails: Email[] = recipients.map((recipient, idx) => ({
      id: `email-demo-${Date.now()}-${idx}`,
      campaignId: campId,
      senderId: 'sender-custom',
      userId: DEMO_USER.id,
      recipient,
      recipientName: null,
      subject: body.subject,
      body: body.body,
      scheduledAt: new Date(startAtMs + idx * delaySec * 1000).toISOString(),
      sentAt: null,
      status: 'SCHEDULED',
      attempts: 0,
      lastError: null,
      messageId: null,
      createdAt: new Date().toISOString(),
      sender: { name: body.senderName, email: body.senderEmail.toLowerCase() },
      campaign: { name: body.name },
    }));

    state.campaigns.unshift(newCampaign);
    state.emails.unshift(...newEmails);
    saveState(state);

    return respond(reqConfig, { campaign: newCampaign, emailsScheduled: newEmails.length }, 201);
  }

  const campMatch = path.match(/^\/campaigns\/([^/]+)$/);
  if (method === 'GET' && campMatch) {
    const id = campMatch[1];
    const campaign = state.campaigns.find((c) => c.id === id);
    if (!campaign) return Promise.reject({ response: { status: 404, data: { error: 'Campaign not found' } } });
    const campEmails = state.emails.filter((e) => e.campaignId === id);
    const emailStats: Record<string, number> = {};
    campEmails.forEach((e) => {
      emailStats[e.status] = (emailStats[e.status] || 0) + 1;
    });
    return respond(reqConfig, { campaign: { ...campaign, emails: campEmails }, emailStats });
  }

  if (method === 'DELETE' && campMatch) {
    const id = campMatch[1];
    state.emails.forEach((e) => {
      if (e.campaignId === id && ['SCHEDULED', 'QUEUED', 'RATE_LIMITED'].includes(e.status)) {
        e.status = 'CANCELLED';
      }
    });
    const camp = state.campaigns.find((c) => c.id === id);
    if (camp) camp.status = 'FAILED';
    saveState(state);
    return respond(reqConfig, { message: 'Campaign cancelled (Demo)' });
  }

  const simMatch = path.match(/^\/campaigns\/([^/]+)\/simulate-send$/);
  if (method === 'POST' && simMatch) {
    const id = simMatch[1];
    let simulatedCount = 0;
    const nowIso = new Date().toISOString();
    state.emails.forEach((e, idx) => {
      if (e.campaignId === id && ['SCHEDULED', 'QUEUED', 'RATE_LIMITED'].includes(e.status)) {
        e.status = 'SENT';
        e.sentAt = nowIso;
        e.attempts += 1;
        e.messageId = `<sim-${Date.now()}-${idx}@demo.reachinbox.ai>`;
        simulatedCount++;
      }
    });
    const camp = state.campaigns.find((c) => c.id === id);
    if (camp) camp.status = 'COMPLETED';
    saveState(state);
    return respond(reqConfig, { simulatedCount });
  }

  // Slack integration
  if (method === 'GET' && path === '/integrations/slack/status') {
    return respond(reqConfig, state.slack);
  }

  if (method === 'POST' && path === '/integrations/slack/disconnect') {
    state.slack = { ...state.slack, connected: false };
    saveState(state);
    return respond(reqConfig, { message: 'Slack disconnected (Demo)' });
  }

  if (method === 'POST' && path === '/integrations/slack/demo-connect') {
    state.slack = {
      connected: true,
      teamName: 'Outbox Labs Workspace (Demo)',
      teamId: 'T0DEMO123',
      connectedAt: new Date().toISOString(),
      configured: true,
    };
    saveState(state);
    return respond(reqConfig, { message: 'Slack connected (Demo)' });
  }

  return respond(reqConfig, {});
};

