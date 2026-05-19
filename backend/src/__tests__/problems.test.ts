/**
 * Problem metadata validation tests
 * Validates every problem JSON file in problems/ has correct structure.
 */

import fs from 'fs';
import path from 'path';

const PROBLEMS_DIR = path.join(__dirname, '../../../problems');

interface Problem {
  slug: string;
  title: string;
  difficulty: string;
  category: string;
  tags: string[];
  hints: string[];
  dockerImage: string;
  timeLimit: number;
  description: string;
}

function loadProblems(): Array<{ file: string; data: Problem }> {
  if (!fs.existsSync(PROBLEMS_DIR)) return [];
  return fs
    .readdirSync(PROBLEMS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(file => ({
      file,
      data: JSON.parse(fs.readFileSync(path.join(PROBLEMS_DIR, file), 'utf-8')) as Problem,
    }));
}

const problems = loadProblems();

describe('Problem JSON files', () => {
  it('at least one problem exists', () => {
    expect(problems.length).toBeGreaterThan(0);
  });

  problems.forEach(({ file, data }) => {
    describe(`${file}`, () => {
      it('has required fields', () => {
        expect(data.slug).toBeTruthy();
        expect(data.title).toBeTruthy();
        expect(data.difficulty).toBeTruthy();
        expect(data.category).toBeTruthy();
        expect(data.dockerImage).toBeTruthy();
        expect(data.description).toBeTruthy();
      });

      it('slug matches filename', () => {
        expect(file).toBe(`${data.slug}.json`);
      });

      it('difficulty is valid', () => {
        expect(['easy', 'medium', 'hard']).toContain(data.difficulty);
      });

      it('dockerImage follows naming convention', () => {
        expect(data.dockerImage).toMatch(/^leetnode-problem-.+:latest$/);
        expect(data.dockerImage).toBe(`leetnode-problem-${data.slug}:latest`);
      });

      it('timeLimit is between 5 and 60 minutes', () => {
        expect(data.timeLimit).toBeGreaterThanOrEqual(300);
        expect(data.timeLimit).toBeLessThanOrEqual(3600);
      });

      it('has at least 2 tags', () => {
        expect(Array.isArray(data.tags)).toBe(true);
        expect(data.tags.length).toBeGreaterThanOrEqual(2);
      });

      it('has exactly 3 hints', () => {
        expect(Array.isArray(data.hints)).toBe(true);
        expect(data.hints.length).toBe(3);
      });

      it('hints do not contain the exact answer code', () => {
        // Hints should guide, not spoil
        const combined = data.hints.join(' ').toLowerCase();
        expect(combined).not.toMatch(/\.item\(\)/);  // Too specific
      });

      it('description has required sections', () => {
        expect(data.description).toContain('## The Situation');
        expect(data.description).toContain('## Your Task');
      });

      it('description mentions useful commands', () => {
        expect(data.description).toContain('```');
      });
    });
  });
});

describe('Docker files exist for every problem', () => {
  const DOCKER_DIR = path.join(__dirname, '../../../docker/problems');

  problems.forEach(({ data }) => {
    it(`${data.slug} has Dockerfile, setup.sh, verify.sh`, () => {
      const dir = path.join(DOCKER_DIR, data.slug);
      expect(fs.existsSync(path.join(dir, 'Dockerfile'))).toBe(true);
      expect(fs.existsSync(path.join(dir, 'setup.sh'))).toBe(true);
      expect(fs.existsSync(path.join(dir, 'verify.sh'))).toBe(true);
    });

    it(`${data.slug}/verify.sh outputs JSON`, () => {
      const verifyPath = path.join(DOCKER_DIR, data.slug, 'verify.sh');
      const content = fs.readFileSync(verifyPath, 'utf-8');
      expect(content).toContain('"success"');
      expect(content).toContain('"message"');
      expect(content).toContain('exit 0');
      expect(content).toContain('exit 1');
    });

    it(`${data.slug}/Dockerfile uses leetnode-base`, () => {
      const dockerfilePath = path.join(DOCKER_DIR, data.slug, 'Dockerfile');
      const content = fs.readFileSync(dockerfilePath, 'utf-8');
      expect(content).toMatch(/^FROM leetnode-base/m);
    });

    it(`${data.slug}/Dockerfile uses sleep infinity CMD`, () => {
      const dockerfilePath = path.join(DOCKER_DIR, data.slug, 'Dockerfile');
      const content = fs.readFileSync(dockerfilePath, 'utf-8');
      expect(content).toContain('sleep');
    });
  });
});
