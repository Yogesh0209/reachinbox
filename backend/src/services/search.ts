import { getElasticsearchClient, EMAIL_INDEX } from '../config/elasticsearch';

interface EmailDocument {
  emailId: string;
  userId: string;
  campaignId: string;
  recipient: string;
  recipientName?: string;
  sender: string;
  subject: string;
  status: string;
  scheduledAt: string;
  sentAt?: string;
}

export const indexEmail = async (doc: EmailDocument): Promise<void> => {
  const client = getElasticsearchClient();
  if (!client) return;

  try {
    await client.index({
      index: EMAIL_INDEX,
      id: doc.emailId,
      document: doc,
    });
  } catch (error) {
    console.warn('[Elasticsearch] Failed to index email:', (error as Error).message);
  }
};

export const searchEmails = async (
  userId: string,
  query: string,
  status?: string,
  from: number = 0,
  size: number = 20,
): Promise<{ hits: EmailDocument[]; total: number }> => {
  const client = getElasticsearchClient();
  if (!client) {
    return { hits: [], total: 0 };
  }

  try {
    const must: any[] = [
      { term: { userId } },
      {
        multi_match: {
          query,
          fields: ['recipient', 'recipientName', 'sender', 'subject'],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      },
    ];

    if (status) {
      must.push({ term: { status } });
    }

    const result = await client.search({
      index: EMAIL_INDEX,
      body: {
        query: { bool: { must } },
        from,
        size,
        sort: [{ scheduledAt: { order: 'desc' } }],
      },
    });

    const hits = result.hits.hits.map((hit: any) => hit._source as EmailDocument);
    const total = typeof result.hits.total === 'number' ? result.hits.total : (result.hits.total as any)?.value || 0;

    return { hits, total };
  } catch (error) {
    console.warn('[Elasticsearch] Search failed:', (error as Error).message);
    return { hits: [], total: 0 };
  }
};

export const updateEmailStatus = async (emailId: string, status: string, sentAt?: string): Promise<void> => {
  const client = getElasticsearchClient();
  if (!client) return;

  try {
    await client.update({
      index: EMAIL_INDEX,
      id: emailId,
      body: {
        doc: { status, ...(sentAt ? { sentAt } : {}) },
      },
    });
  } catch (error) {
    console.warn('[Elasticsearch] Failed to update email status:', (error as Error).message);
  }
};
