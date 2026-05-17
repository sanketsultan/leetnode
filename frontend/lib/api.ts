export interface Problem {
  slug: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  tags: string[];
  hints?: string[];
  dockerImage: string;
  timeLimit: number;
}

export interface SessionResponse {
  sessionId: string;
  problemSlug: string;
  expiresAt: string;
  status: string;
  wsUrl: string;
}

export interface VerifyResult {
  success: boolean;
  message: string;
}

// Server components run in Node.js and need an absolute URL.
// Client components go through the Next.js rewrite proxy at /api → localhost:3001.
const BASE =
  typeof window === 'undefined'
    ? 'http://localhost:3001/api'
    : '/api';

export async function getProblems(): Promise<Problem[]> {
  const res = await fetch(`${BASE}/problems`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch problems');
  return res.json();
}

export async function getProblem(slug: string): Promise<Problem> {
  const res = await fetch(`${BASE}/problems/${slug}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Problem "${slug}" not found`);
  return res.json();
}

export async function createSession(problemSlug: string): Promise<SessionResponse> {
  const res = await fetch(`${BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ problemSlug }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || 'Failed to create session');
  }
  return res.json();
}

export async function verifySession(sessionId: string): Promise<VerifyResult> {
  const res = await fetch(`${BASE}/sessions/${sessionId}/verify`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Verification failed' }));
    throw new Error(err.error || 'Verification failed');
  }
  return res.json();
}

export async function deleteSession(sessionId: string): Promise<void> {
  await fetch(`${BASE}/sessions/${sessionId}`, { method: 'DELETE' });
}
