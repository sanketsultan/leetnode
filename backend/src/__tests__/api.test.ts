/**
 * Backend API integration tests
 * Tests all REST endpoints without spinning up real Docker containers.
 */

import request from 'supertest';
import express from 'express';
import cors from 'cors';
import path from 'path';

// Minimal app setup (no Docker, no WS) for route testing
function createTestApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Mount real routes — they read from the filesystem
  // Override PROBLEMS_DIR to point to test fixtures or real problems dir
  process.env['PROBLEMS_DIR'] = path.join(__dirname, '../../../problems');

  const problemsRouter = require('../routes/problems').default;
  app.use('/api/problems', problemsRouter);

  return app;
}

describe('Health endpoint', () => {
  const app = createTestApp();

  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });
});

describe('Problems API', () => {
  const app = createTestApp();

  it('GET /api/problems returns array', async () => {
    const res = await request(app).get('/api/problems');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/problems returns problems with required fields', async () => {
    const res = await request(app).get('/api/problems');
    expect(res.status).toBe(200);
    if (res.body.length > 0) {
      const problem = res.body[0];
      expect(problem).toHaveProperty('slug');
      expect(problem).toHaveProperty('title');
      expect(problem).toHaveProperty('difficulty');
      expect(problem).toHaveProperty('category');
      expect(problem).toHaveProperty('tags');
      expect(problem).toHaveProperty('dockerImage');
      expect(problem).toHaveProperty('timeLimit');
      // Hints should be stripped from list view
      expect(problem.hints).toBeUndefined();
    }
  });

  it('GET /api/problems/:slug returns full problem with hints', async () => {
    const listRes = await request(app).get('/api/problems');
    if (listRes.body.length === 0) return; // skip if no problems

    const slug = listRes.body[0].slug;
    const res = await request(app).get(`/api/problems/${slug}`);
    expect(res.status).toBe(200);
    expect(res.body.slug).toBe(slug);
    expect(res.body.description).toBeDefined();
    expect(Array.isArray(res.body.hints)).toBe(true);
    expect(res.body.hints.length).toBeGreaterThan(0);
  });

  it('GET /api/problems/:slug returns 404 for unknown slug', async () => {
    const res = await request(app).get('/api/problems/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it('difficulty is one of easy/medium/hard', async () => {
    const res = await request(app).get('/api/problems');
    for (const p of res.body) {
      expect(['easy', 'medium', 'hard']).toContain(p.difficulty);
    }
  });

  it('timeLimit is a positive number', async () => {
    const res = await request(app).get('/api/problems');
    for (const p of res.body) {
      expect(typeof p.timeLimit).toBe('number');
      expect(p.timeLimit).toBeGreaterThan(0);
    }
  });

  it('tags is a non-empty array of strings', async () => {
    const res = await request(app).get('/api/problems');
    for (const p of res.body) {
      expect(Array.isArray(p.tags)).toBe(true);
      expect(p.tags.length).toBeGreaterThan(0);
      p.tags.forEach((tag: unknown) => expect(typeof tag).toBe('string'));
    }
  });
});

describe('Sessions API validation', () => {
  const app = createTestApp();

  // Mount sessions route with a mocked session manager
  beforeAll(() => {
    // Mock dockerService so we don't need Docker running
    jest.mock('../services/dockerService', () => ({
      initializeDocker: jest.fn(),
      cleanupOrphanedContainers: jest.fn().mockResolvedValue(undefined),
      createAndStartContainer: jest.fn().mockResolvedValue({
        containerId: 'mock-container-id-123',
        containerName: 'leetnode-session-mock',
      }),
      destroyContainer: jest.fn().mockResolvedValue(undefined),
      execVerify: jest.fn().mockResolvedValue({ success: true, message: 'Mock verify passed' }),
      getDockerInstance: jest.fn(),
    }));

    const sessionsRouter = require('../routes/sessions').default;
    app.use('/api/sessions', sessionsRouter);
  });

  it('POST /api/sessions without body returns 400', async () => {
    const res = await request(app).post('/api/sessions').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('POST /api/sessions with unknown slug returns 404', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send({ problemSlug: 'does-not-exist' });
    expect(res.status).toBe(404);
  });

  it('GET /api/sessions/:id returns 404 for unknown session', async () => {
    const res = await request(app).get('/api/sessions/nonexistent-session-id');
    expect(res.status).toBe(404);
  });

  it('POST /api/sessions/:id/verify returns 404 for unknown session', async () => {
    const res = await request(app).post('/api/sessions/nonexistent/verify');
    expect(res.status).toBe(404);
  });

  it('DELETE /api/sessions/:id returns 404 for unknown session', async () => {
    const res = await request(app).delete('/api/sessions/nonexistent');
    expect(res.status).toBe(404);
  });
});
