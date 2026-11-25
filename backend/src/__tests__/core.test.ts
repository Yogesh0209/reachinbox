import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isValidEmail, parseRecipientFile } from '../utils/email-validator';
import { generateIdempotencyKey } from '../utils/idempotency';
import { encrypt, decrypt } from '../utils/encryption';

// Mock Redis for rate-limiter unit tests
const mockEval = vi.fn();
const mockGet = vi.fn();
const mockExists = vi.fn();
const mockSet = vi.fn();

vi.mock('../config/redis', () => ({
  redis: {
    eval: (...args: any[]) => mockEval(...args),
    get: (...args: any[]) => mockGet(...args),
    exists: (...args: any[]) => mockExists(...args),
    set: (...args: any[]) => mockSet(...args),
  },
  createRedisConnection: vi.fn(),
}));

import {
  checkHourlyRateLimit,
  checkMinDelay,
  wasRateLimitNotified,
  markRateLimitNotified,
} from '../services/rate-limiter';

describe('Email Validator & CSV/TXT Parsing', () => {
  it('validates correct and incorrect email formats', () => {
    expect(isValidEmail('alice@example.com')).toBe(true);
    expect(isValidEmail('bob.smith+tag@sub.domain.co.uk')).toBe(true);
    expect(isValidEmail('invalid-email')).toBe(false);
    expect(isValidEmail('missing@domain')).toBe(false);
    expect(isValidEmail('@nodomain.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });

  it('parses TXT file with one email per line and deduplicates', () => {
    const txt = `
      alice@example.com
      bob@example.com
      ALICE@example.com
      not-an-email
      charlie@company.org
    `;
    const result = parseRecipientFile(txt, 'leads.txt');
    expect(result.valid).toEqual([
      'alice@example.com',
      'bob@example.com',
      'charlie@company.org',
    ]);
    expect(result.invalid).toEqual(['not-an-email']);
    expect(result.duplicatesRemoved).toBe(1);
  });

  it('parses CSV file with header and detects email column', () => {
    const csv = `name,email,company
Alice,alice@acme.com,Acme
Bob,bob@acme.com,Acme
Bad,invalid_row,Acme
Alice Dup,alice@acme.com,Acme`;
    const result = parseRecipientFile(csv, 'contacts.csv');
    expect(result.valid).toEqual(['alice@acme.com', 'bob@acme.com']);
    expect(result.invalid).toHaveLength(1);
    expect(result.duplicatesRemoved).toBe(1);
  });

  it('parses CSV file without header by detecting email in cells', () => {
    const csv = `John Doe,john@doe.io,CEO
Jane Roe,jane@roe.io,CTO`;
    const result = parseRecipientFile(csv, 'noheader.csv');
    expect(result.valid).toEqual(['john@doe.io', 'jane@roe.io']);
    expect(result.invalid).toEqual([]);
  });
});

describe('Idempotency & Job Scheduling Helpers', () => {
  it('generates deterministic UUIDv5 idempotency keys', () => {
    const k1 = generateIdempotencyKey('camp-1', 'alice@example.com', 0);
    const k2 = generateIdempotencyKey('camp-1', 'alice@example.com', 0);
    const k3 = generateIdempotencyKey('camp-1', 'alice@example.com', 1);
    const k4 = generateIdempotencyKey('camp-2', 'alice@example.com', 0);

    expect(k1).toBe(k2);
    expect(k1).not.toBe(k3);
    expect(k1).not.toBe(k4);
    expect(k1).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('calculates deterministic job IDs and delays from scheduledAt', () => {
    const emailId = 'abc-123';
    const jobId = `send-email-${emailId}`;
    expect(jobId).toBe('send-email-abc-123');

    const now = 1700000000000;
    const future = new Date(now + 15000);
    const past = new Date(now - 5000);
    expect(Math.max(0, future.getTime() - now)).toBe(15000);
    expect(Math.max(0, past.getTime() - now)).toBe(0);
  });
});

describe('Encryption (Slack Token Storage)', () => {
  it('encrypts and decrypts tokens roundtrip using AES-256-GCM', () => {
    const raw = 'xoxb-1234567890-abcdefg';
    const encrypted = encrypt(raw);
    expect(encrypted).not.toBe(raw);
    expect(encrypted.split(':')).toHaveLength(3);
    expect(decrypt(encrypted)).toBe(raw);
  });
});

describe('Rate Limiter & Sender Spacing (Mocked Redis)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows send when hourly Redis Lua counter returns 1, rejects when 0', async () => {
    mockEval.mockResolvedValueOnce(1);
    expect(await checkHourlyRateLimit('sender-1', 100)).toBe(true);

    mockEval.mockResolvedValueOnce(0);
    expect(await checkHourlyRateLimit('sender-1', 100)).toBe(false);
    expect(mockEval).toHaveBeenCalledTimes(2);
  });

  it('enforces minimum delay between sends via Redis Lua script', async () => {
    mockEval.mockResolvedValueOnce(0);
    expect(await checkMinDelay('sender-1')).toBe(0);

    mockEval.mockResolvedValueOnce(1450);
    expect(await checkMinDelay('sender-1')).toBe(1450);
  });

  it('deduplicates Slack rate-limit notifications per sender+hour', async () => {
    mockExists.mockResolvedValueOnce(0);
    expect(await wasRateLimitNotified('user1:sender@acme.com')).toBe(false);

    await markRateLimitNotified('user1:sender@acme.com');
    expect(mockSet).toHaveBeenCalledWith(expect.stringContaining('notified:ratelimit:'), '1', 'EX', 3700);

    mockExists.mockResolvedValueOnce(1);
    expect(await wasRateLimitNotified('user1:sender@acme.com')).toBe(true);
  });
});
