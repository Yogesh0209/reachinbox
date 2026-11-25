import { prisma } from '../config/prisma';
import { decrypt } from '../utils/encryption';
import { wasRateLimitNotified, markRateLimitNotified } from './rate-limiter';

export const sendSlackRateLimitNotification = async (
  userId: string,
  senderEmail: string,
  hourlyLimit: number,
  rescheduledCount: number,
): Promise<void> => {
  try {
    const integration = await prisma.slackIntegration.findUnique({
      where: { userId },
    });

    if (!integration || !integration.connected) {
      return;
    }

    // Check if already notified for this sender+hour
    const alreadyNotified = await wasRateLimitNotified(`${userId}:${senderEmail}`);
    if (alreadyNotified) {
      return;
    }

    const token = decrypt(integration.encryptedToken);

    // Post to Slack using chat.postMessage
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: integration.channelId || integration.teamId,
        text: `⚠️ *ReachInbox Rate Limit Reached*\n\n• Sender: \`${senderEmail}\`\n• Hourly Limit: ${hourlyLimit} emails/hour\n• Rescheduled: ${rescheduledCount} email(s) to next window\n• Time: ${new Date().toISOString()}`,
      }),
    });

    if (response.ok) {
      await markRateLimitNotified(`${userId}:${senderEmail}`);
      console.log(`[Slack] Rate limit notification sent for ${senderEmail}`);
    } else {
      console.warn('[Slack] Failed to send notification:', await response.text());
    }
  } catch (error) {
    console.warn('[Slack] Error sending notification:', (error as Error).message);
  }
};
