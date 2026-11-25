import { Client } from '@elastic/elasticsearch';
import { config } from './index';

let esClient: Client | null = null;

export const getElasticsearchClient = (): Client | null => {
  if (!config.elasticsearch.url) return null;
  if (!esClient) {
    esClient = new Client({
      node: config.elasticsearch.url,
      requestTimeout: 5000,
    });
  }
  return esClient;
};

export const EMAIL_INDEX = 'reachinbox-emails';

export const ensureEmailIndex = async (): Promise<void> => {
  const client = getElasticsearchClient();
  if (!client) return;

  try {
    const exists = await client.indices.exists({ index: EMAIL_INDEX });
    if (!exists) {
      await client.indices.create({
        index: EMAIL_INDEX,
        body: {
          mappings: {
            properties: {
              emailId: { type: 'keyword' },
              userId: { type: 'keyword' },
              campaignId: { type: 'keyword' },
              recipient: { type: 'text', fields: { keyword: { type: 'keyword' } } },
              recipientName: { type: 'text' },
              sender: { type: 'text', fields: { keyword: { type: 'keyword' } } },
              subject: { type: 'text' },
              status: { type: 'keyword' },
              scheduledAt: { type: 'date' },
              sentAt: { type: 'date' },
            },
          },
        },
      });
      console.log('[Elasticsearch] Email index created');
    }
  } catch (error) {
    console.warn('[Elasticsearch] Failed to ensure index:', (error as Error).message);
  }
};
