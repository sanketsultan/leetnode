import { Router, Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';
import { Problem } from '../types';

const router = Router();

export async function loadProblem(slug: string): Promise<Problem | null> {
  try {
    const filePath = path.join(config.PROBLEMS_DIR, `${slug}.json`);
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as Problem;
  } catch {
    return null;
  }
}

export async function loadAllProblems(): Promise<Problem[]> {
  try {
    const files = await fs.readdir(config.PROBLEMS_DIR);
    const problems = await Promise.all(
      files
        .filter((f) => f.endsWith('.json'))
        .map(async (f) => {
          const raw = await fs.readFile(path.join(config.PROBLEMS_DIR, f), 'utf-8');
          return JSON.parse(raw) as Problem;
        })
    );
    return problems;
  } catch {
    return [];
  }
}

// GET /api/problems
router.get('/', async (_req: Request, res: Response) => {
  const problems = await loadAllProblems();
  // Strip hints from list view
  const stripped = problems.map(({ hints: _h, ...rest }) => rest);
  res.json(stripped);
});

// GET /api/problems/:slug
router.get('/:slug', async (req: Request, res: Response) => {
  const problem = await loadProblem(req.params['slug'] as string);
  if (!problem) {
    res.status(404).json({ error: `Problem "${req.params['slug']}" not found` });
    return;
  }
  res.json(problem);
});

export default router;
