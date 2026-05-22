import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

// ── Storage ────────────────────────────────────────────────────────────────────

const DATA_DIR    = path.join(process.cwd(), 'data');
const SOLVES_FILE = path.join(DATA_DIR, 'solves.json');

export interface Solve {
  login:     string;
  avatar:    string;
  slug:      string;
  difficulty: string;
  quality?:  string;
  solvedAt:  string;
  elapsedS:  number;
}

export interface LeaderboardEntry {
  login:       string;
  avatar:      string;
  solved:      number;
  score:       number;
  lastSolvedAt: string;
  qualities:   Record<string, number>;
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadSolves(): Solve[] {
  try {
    ensureDataDir();
    if (!fs.existsSync(SOLVES_FILE)) return [];
    return JSON.parse(fs.readFileSync(SOLVES_FILE, 'utf-8')) as Solve[];
  } catch {
    return [];
  }
}

function saveSolves(solves: Solve[]): void {
  ensureDataDir();
  fs.writeFileSync(SOLVES_FILE, JSON.stringify(solves, null, 2), 'utf-8');
}

// ── Scoring ───────────────────────────────────────────────────────────────────

export function calcScore(solve: Solve): number {
  const base = ({ easy: 100, medium: 200, hard: 400 } as Record<string, number>)[solve.difficulty] ?? 100;
  const speedBonus = solve.elapsedS > 0 && solve.elapsedS < 300 ? 40 : 0;
  return base + speedBonus;
}

// ── Leaderboard aggregation ───────────────────────────────────────────────────

export function buildLeaderboard(): LeaderboardEntry[] {
  const solves = loadSolves();

  const byUser: Record<string, { login: string; avatar: string; solves: Solve[] }> = {};
  for (const s of solves) {
    if (!byUser[s.login]) byUser[s.login] = { login: s.login, avatar: s.avatar, solves: [] };
    byUser[s.login].avatar = s.avatar; // keep most recent avatar
    byUser[s.login].solves.push(s);
  }

  return Object.values(byUser)
    .map(u => {
      const score       = u.solves.reduce((sum, s) => sum + calcScore(s), 0);
      const lastSolvedAt = u.solves.reduce((l, s) => (s.solvedAt > l ? s.solvedAt : l), '');
      const qualities   = u.solves.reduce((acc, s) => {
        if (s.quality) acc[s.quality] = (acc[s.quality] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      return { login: u.login, avatar: u.avatar, solved: u.solves.length, score, lastSolvedAt, qualities };
    })
    .sort((a, b) => b.score - a.score || b.solved - a.solved);
}

// ── Router ────────────────────────────────────────────────────────────────────

const router = Router();

// POST /api/solves — record a solve (called by Next.js API route with verified session)
router.post('/', (req: Request, res: Response) => {
  const { login, avatar, slug, difficulty, quality, elapsedS } = req.body as Partial<Solve & { elapsedS: number }>;

  if (!login || !slug) {
    return res.status(400).json({ error: 'login and slug required' });
  }

  const solves = loadSolves();

  // Deduplicate: only record first solve per user per problem
  if (solves.some(s => s.login === login && s.slug === slug)) {
    return res.json({ recorded: false, message: 'already solved' });
  }

  const solve: Solve = {
    login:      String(login).slice(0, 64),
    avatar:     String(avatar ?? '').slice(0, 256),
    slug:       String(slug).slice(0, 64),
    difficulty: String(difficulty ?? 'easy'),
    quality:    quality ? String(quality).slice(0, 32) : undefined,
    solvedAt:   new Date().toISOString(),
    elapsedS:   Math.max(0, Number(elapsedS) || 0),
  };

  solves.push(solve);
  saveSolves(solves);

  return res.json({ recorded: true, score: calcScore(solve) });
});

// GET /api/solves/user/:login — solve history for a user
router.get('/user/:login', (req: Request, res: Response) => {
  const { login } = req.params;
  const solves = loadSolves().filter(s => s.login === login);
  res.json(solves);
});

export default router;
