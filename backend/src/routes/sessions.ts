import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { createSession, getSession, expireSession, getAllSessions } from '../services/sessionManager';
import { execVerify } from '../services/dockerService';
import { config } from '../config';
import { loadProblem, loadAllProblems } from './problems';

const router = Router();

// POST /api/sessions — create a new session
router.post('/', async (req: Request, res: Response) => {
  const schema = z.object({ problemSlug: z.string().min(1) });
  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: 'problemSlug is required' });
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

// GET /api/sessions/:sessionId
router.get('/:sessionId', (req: Request, res: Response) => {
  const sessionId = req.params['sessionId'] as string;
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

// POST /api/sessions/:sessionId/verify
router.post('/:sessionId/verify', async (req: Request, res: Response) => {
  const sessionId = req.params['sessionId'] as string;
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

// DELETE /api/sessions/:sessionId
router.delete('/:sessionId', async (req: Request, res: Response) => {
  const sessionId = req.params['sessionId'] as string;
  const session = getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  await expireSession(sessionId);
  res.status(204).send();
});

// GET /api/sessions (admin/debug)
router.get('/', (_req: Request, res: Response) => {
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
