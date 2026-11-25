import app from './app';
import { config } from './config';
import { prisma } from './config/prisma';
import { ensureEmailIndex } from './config/elasticsearch';

const start = async () => {
  console.log('====================================');
  console.log('  ReachInbox API Server');
  console.log(`  Port: ${config.port}`);
  console.log(`  Environment: ${config.nodeEnv}`);
  console.log(`  Dev Auth: ${config.devAuth.enabled}`);
  console.log('====================================');

  // Test database connection
  try {
    await prisma.$connect();
    console.log('[Database] Connected to PostgreSQL');
  } catch (error) {
    console.error('[Database] Connection failed:', (error as Error).message);
    process.exit(1);
  }

  // Setup Elasticsearch index
  ensureEmailIndex().catch((err) => {
    console.warn('[Elasticsearch] Index setup failed (non-fatal):', err.message);
  });

  app.listen(config.port, () => {
    console.log(`[Server] Running on http://localhost:${config.port}`);
    console.log(`[Bull Board] http://localhost:${config.port}/admin/queues`);
  });
};

start().catch((error) => {
  console.error('[Server] Failed to start:', error);
  process.exit(1);
});
