import { config } from './config';
import { createEmailWorker } from './workers/email-worker';
import { ensureEmailIndex } from './config/elasticsearch';

console.log('====================================');
console.log('  ReachInbox Email Worker');
console.log(`  Concurrency: ${config.worker.concurrency}`);
console.log(`  Min Delay: ${config.worker.minDelayMs}ms`);
console.log(`  Max/Hour/Sender: ${config.worker.maxEmailsPerHourPerSender}`);
console.log('====================================');

const worker = createEmailWorker();

ensureEmailIndex().catch((err) => {
  console.warn('[Worker] Elasticsearch index setup failed:', err.message);
});

const shutdown = async () => {
  console.log('[Worker] Shutting down gracefully...');
  await worker.close();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log('[Worker] Ready and waiting for jobs...');
