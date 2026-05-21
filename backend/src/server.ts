import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
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

  // ── Security headers ───────────────────────────────────────────────────────
  app.use(helmet({
    contentSecurityPolicy: false, // handled by nginx/Cloudflare
    crossOriginEmbedderPolicy: false,
  }));

  // ── CORS ──────────────────────────────────────────────────────────────────
  app.use(cors({ origin: config.FRONTEND_URL, credentials: true }));

  // ── Body parsing ──────────────────────────────────────────────────────────
  app.use(express.json({ limit: '16kb' })); // prevent oversized bodies

  // ── Rate limiting (defense-in-depth; Cloudflare WAF is the outer layer) ──
  // Session creation: most expensive op — spawns a Docker container
  const sessionCreateLimiter = rateLimit({
    windowMs: 60 * 1000,   // 1 minute window
    max: 6,                // 6 session creates per IP per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many sessions created. Please wait a minute.' },
  });

  // Feedback submission
  const feedbackLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many feedback submissions. Please wait a minute.' },
  });

  // General API (loose — catches anything else)
  const generalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests.' },
  });

  app.use('/api', generalLimiter);

  // ── Health check ──────────────────────────────────────────────────────────
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── Routes ────────────────────────────────────────────────────────────────
  app.use('/api/problems', problemsRouter);
  app.use('/api/sessions', sessionCreateLimiter, sessionsRouter);
  app.use('/api/feedback', feedbackLimiter,      feedbackRouter);

  // ── Start HTTP server ─────────────────────────────────────────────────────
  app.listen(config.PORT, () => {
    console.log(`[HTTP] API server listening on port ${config.PORT}`);
  });

  // ── Start WebSocket server ────────────────────────────────────────────────
  startWebSocketServer();
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
