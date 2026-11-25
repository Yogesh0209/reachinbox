export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export interface Campaign {
  id: string;
  userId: string;
  name: string;
  subject: string;
  body: string;
  startAt: string;
  delaySeconds: number;
  hourlyLimit: number;
  totalRecipients: number;
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
  emailStats?: Record<string, number>;
  _count?: { emails: number };
}

export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED';

export interface Email {
  id: string;
  campaignId: string;
  senderId: string;
  userId: string;
  recipient: string;
  recipientName: string | null;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt: string | null;
  status: EmailStatus;
  attempts: number;
  lastError: string | null;
  messageId: string | null;
  createdAt: string;
  sender?: { name: string; email: string };
  campaign?: { name: string };
}

export type EmailStatus = 'SCHEDULED' | 'QUEUED' | 'PROCESSING' | 'SENT' | 'FAILED' | 'RATE_LIMITED' | 'CANCELLED';

export interface EmailStats {
  total: number;
  scheduled: number;
  sent: number;
  failed: number;
  processing: number;
  rateLimited: number;
  cancelled: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface SlackStatus {
  connected: boolean;
  teamName: string | null;
  teamId: string | null;
  connectedAt: string | null;
  configured: boolean;
}

export interface UploadResult {
  valid: string[];
  invalid: string[];
  validCount: number;
  invalidCount: number;
  duplicatesRemoved: number;
}
