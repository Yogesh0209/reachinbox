import { redis } from '../config/redis';
import { config } from '../config';

/**
 * Redis-backed rate limiter for sender-based email sending.
 * Uses atomic Lua scripts to ensure correctness across concurrent workers.
 */

// Lua script: atomically check and increment hourly counter
const RATE_LIMIT_LUA = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])
local current = tonumber(redis.call('GET', key) or '0')
if current >= limit then
  return 0
end
redis.call('INCR', key)
if current == 0 then
  redis.call('EXPIRE', key, ttl)
end
return 1
`;

// Lua script: check and enforce minimum delay between sends
const DELAY_CHECK_LUA = `
local key = KEYS[1]
local minDelay = tonumber(ARGV[1])
local now = tonumber(ARGV[2])
local lastSend = tonumber(redis.call('GET', key) or '0')
if (now - lastSend) < minDelay then
  return lastSend + minDelay - now
end
redis.call('SET', key, now)
redis.call('EXPIRE', key, 120)
return 0
`;

/**
 * Check if sender can send within hourly rate limit.
 * Returns true if send is allowed, false if rate limited.
 */
export const checkHourlyRateLimit = async (senderId: string, limit?: number): Promise<boolean> => {
  const maxPerHour = limit || config.worker.maxEmailsPerHourPerSender;
  const now = new Date();
  const hourKey = `rate:hourly:${senderId}:${now.getUTCFullYear()}:${now.getUTCMonth()}:${now.getUTCDate()}:${now.getUTCHours()}`;

  const result = await redis.eval(RATE_LIMIT_LUA, 1, hourKey, maxPerHour, 3700) as number;
  return result === 1;
};

/**
 * Check minimum delay between sends for a sender.
 * Returns 0 if send is allowed, or milliseconds to wait.
 */
export const checkMinDelay = async (senderId: string): Promise<number> => {
  const minDelayMs = config.worker.minDelayMs;
  const now = Date.now();
  const delayKey = `rate:delay:${senderId}`;

  const waitMs = await redis.eval(DELAY_CHECK_LUA, 1, delayKey, minDelayMs, now) as number;
  return Math.max(0, waitMs);
};

/**
 * Get current hourly count for a sender.
 */
export const getHourlyCount = async (senderId: string): Promise<number> => {
  const now = new Date();
  const hourKey = `rate:hourly:${senderId}:${now.getUTCFullYear()}:${now.getUTCMonth()}:${now.getUTCDate()}:${now.getUTCHours()}`;
  const count = await redis.get(hourKey);
  return count ? parseInt(count, 10) : 0;
};

/**
 * Check if rate limit notification was already sent for this sender+hour window.
 */
export const wasRateLimitNotified = async (senderId: string): Promise<boolean> => {
  const now = new Date();
  const key = `notified:ratelimit:${senderId}:${now.getUTCHours()}`;
  const exists = await redis.exists(key);
  return exists === 1;
};

/**
 * Mark that rate limit notification was sent for this sender+hour window.
 */
export const markRateLimitNotified = async (senderId: string): Promise<void> => {
  const now = new Date();
  const key = `notified:ratelimit:${senderId}:${now.getUTCHours()}`;
  await redis.set(key, '1', 'EX', 3700);
};
