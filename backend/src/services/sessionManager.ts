import { v4 as uuidv4 } from 'uuid';
import { Session, Problem } from '../types';
import { config } from '../config';
import { createAndStartContainer, destroyContainer } from './dockerService';

const sessions = new Map<string, Session>();
const cleanupTimers = new Map<string, NodeJS.Timeout>();

export async function createSession(problem: Problem): Promise<Session> {
  // If at capacity, evict the oldest session to make room
  if (sessions.size >= config.MAX_SESSIONS) {
    const oldest = Array.from(sessions.values()).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    )[0];
    if (oldest) {
      console.log(`[Session] At capacity (${config.MAX_SESSIONS}), evicting oldest session ${oldest.id}`);
      await expireSession(oldest.id);
    }
  }

  const sessionId = uuidv4();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.SESSION_TTL_MS);

  // Optimistic insert so the session exists before container starts
  const session: Session = {
    id: sessionId,
    problemSlug: problem.slug,
    containerId: '',
    containerName: '',
    createdAt: now,
    expiresAt,
    status: 'starting',
  };
  sessions.set(sessionId, session);

  try {
    const { containerId, containerName } = await createAndStartContainer(
      problem.slug,
      sessionId,
      problem.dockerImage
    );

    session.containerId = containerId;
    session.containerName = containerName;
    session.status = 'ready';

    console.log(`[Session] Created ${sessionId} (${problem.slug}) → container ${containerId.slice(0, 12)}`);

    // Schedule auto-expiry
    const timer = setTimeout(() => expireSession(sessionId), config.SESSION_TTL_MS);
    cleanupTimers.set(sessionId, timer);

    return session;
  } catch (err) {
    sessions.delete(sessionId);
    throw err;
  }
}

export function getSession(sessionId: string): Session | undefined {
  return sessions.get(sessionId);
}

export function getAllSessions(): Session[] {
  return Array.from(sessions.values());
}

export async function expireSession(sessionId: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session) return;

  session.status = 'expired';
  sessions.delete(sessionId);

  const timer = cleanupTimers.get(sessionId);
  if (timer) {
    clearTimeout(timer);
    cleanupTimers.delete(sessionId);
  }

  if (session.containerId) {
    await destroyContainer(session.containerId);
  }

  console.log(`[Session] Expired ${sessionId}`);
}

export function getSessionCount(): number {
  return sessions.size;
}
