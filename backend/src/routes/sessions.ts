import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { createSession, getSession, expireSession, getAllSessions } from '../services/sessionManager';
import { execVerify } from '../services/dockerService';
import { config } from '../config';
import { loadProblem } from './problems';

const router = Router();

// UUID v4 format — only accept well-formed session IDs to prevent
// arbitrary strings from reaching Docker API calls
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidSessionId(id: string): boolean {
  return UUID_V4.test(id);
}

// ── POST /api/sessions — create a new session ──────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  const schema = z.object({
    problemSlug: z
      .string()
      .min(1)
      .max(64)
      // Only allow safe slug characters — prevents path traversal / injection
      .regex(/^[a-z0-9-]+$/, 'Invalid problem slug format'),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid or missing problemSlug' });
    return;
  }

  const { problemSlug } = parsed.data;

  const problem = await loadProblem(problemSlug);
  if (!problem) {
    res.status(404).json({ error: `Problem "${problemSlug}" not found` });
    return;
  }

  try {
    const session = await createSession(problem);
    res.status(201).json({
      sessionId: session.id,
      problemSlug: session.problemSlug,
      expiresAt: session.expiresAt,
      status: session.status,
      wsUrl: `${config.WS_PUBLIC_URL}?sessionId=${session.id}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create session';
    res.status(503).json({ error: message });
  }
});

// ── GET /api/sessions/:sessionId ───────────────────────────────────────────
router.get('/:sessionId', (req: Request, res: Response) => {
  const sessionId = req.params['sessionId'] as string;

  if (!isValidSessionId(sessionId)) {
    res.status(400).json({ error: 'Invalid sessionId format' });
    return;
  }

  const session = getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: 'Session not found or expired' });
    return;
  }

  const now = Date.now();
  const timeRemaining = Math.max(0, session.expiresAt.getTime() - now);

  res.json({
    sessionId: session.id,
    problemSlug: session.problemSlug,
    status: session.status,
    expiresAt: session.expiresAt,
    timeRemaining,
    wsUrl: `${config.WS_PUBLIC_URL}?sessionId=${session.id}`,
  });
});

// ── POST /api/sessions/:sessionId/verify ───────────────────────────────────
router.post('/:sessionId/verify', async (req: Request, res: Response) => {
  const sessionId = req.params['sessionId'] as string;

  if (!isValidSessionId(sessionId)) {
    res.status(400).json({ error: 'Invalid sessionId format' });
    return;
  }

  const session = getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: 'Session not found or expired' });
    return;
  }

  if (session.status !== 'ready') {
    res.status(409).json({ error: 'Session is not ready' });
    return;
  }

  try {
    const result = await execVerify(session.containerId);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Verification failed';
    res.status(500).json({ error: message });
  }
});

// ── DELETE /api/sessions/:sessionId ───────────────────────────────────────
router.delete('/:sessionId', async (req: Request, res: Response) => {
  const sessionId = req.params['sessionId'] as string;

  if (!isValidSessionId(sessionId)) {
    res.status(400).json({ error: 'Invalid sessionId format' });
    return;
  }

  const session = getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  await expireSession(sessionId);
  res.status(204).send();
});

// ── POST /api/sessions/:sessionId/delete — sendBeacon fallback ────────────
router.post('/:sessionId/delete', async (req: Request, res: Response) => {
  const sessionId = req.params['sessionId'] as string;

  if (!isValidSessionId(sessionId)) {
    res.status(204).send(); // silent rejection — beacon can't read responses
    return;
  }

  const session = getSession(sessionId);
  if (session) await expireSession(sessionId);
  res.status(204).send();
});

// ── GET /api/sessions — admin only ────────────────────────────────────────
// Protected by a secret token; returns 404 when token not set so the endpoint
// is invisible in production unless explicitly configured.
router.get('/', (req: Request, res: Response) => {
  const adminSecret = config.ADMIN_SECRET;
  if (!adminSecret) {
    // No secret configured → treat as non-existent in production
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const token = req.headers['x-admin-token'];
  if (token !== adminSecret) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const sessions = getAllSessions().map((s) => ({
    id: s.id,
    problemSlug: s.problemSlug,
    status: s.status,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
  }));
  res.json({ count: sessions.length, sessions });
});

export default router;
