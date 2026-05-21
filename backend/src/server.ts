import express from 'express';
import cors from 'cors';
import { config } from './config';
import { initializeDocker, cleanupOrphanedContainers } from './services/dockerService';
import { startWebSocketServer } from './ws/terminalHandler';
import sessionsRouter from './routes/sessions';
import problemsRouter from './routes/problems';
import feedbackRouter from './routes/feedback';

async function main() {
  // Initialize Docker connection
  initializeDocker();
  await cleanupOrphanedContainers();

  // Express app
  const app = express();

  app.use(cors({ origin: config.FRONTEND_URL, credentials: true }));
  app.use(express.json());

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Routes
  app.use('/api/problems', problemsRouter);
  app.use('/api/sessions', sessionsRouter);
  app.use('/api/feedback', feedbackRouter);

  // Start HTTP server
  app.listen(config.PORT, () => {
    console.log(`[HTTP] API server listening on port ${config.PORT}`);
  });

  // Start WebSocket server
  startWebSocketServer();
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
