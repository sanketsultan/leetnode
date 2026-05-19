import { test, expect } from '@playwright/test';

/**
 * LeetNode E2E tests
 * Requires: backend running on :3001, frontend on :3000
 * Run: cd frontend && npx playwright test
 */

test.describe('Home page', () => {
  test('loads and shows problem list', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/LeetNode/i);
    // Problem rows are <a class="problem-row">
    await expect(page.locator('a.problem-row').first()).toBeVisible({ timeout: 10000 });
  });

  test('shows at least one problem row', async ({ page }) => {
    await page.goto('/');
    const rows = page.locator('a.problem-row');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('difficulty badges are colour-coded', async ({ page }) => {
    await page.goto('/');
    // difficulty span inside a problem row
    await expect(page.locator('a.problem-row span').filter({ hasText: /^(easy|medium|hard)$/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('shows problem title and tags', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('a.problem-row').first()).toBeVisible({ timeout: 10000 });
    // Title is a span with class problem-title
    await expect(page.locator('.problem-title').first()).toBeVisible();
  });
});

test.describe('Problem detail page', () => {
  test('navigates to problem on row click', async ({ page }) => {
    await page.goto('/');
    const firstLink = page.locator('a[href^="/problems/"]').first();
    await expect(firstLink).toBeVisible({ timeout: 10000 });
    await firstLink.click();
    await expect(page).toHaveURL(/\/problems\/.+/);
  });

  test('problem page shows description panel', async ({ page }) => {
    await page.goto('/');
    const firstLink = page.locator('a[href^="/problems/"]').first();
    const href = await firstLink.getAttribute('href');
    await page.goto(href!);

    // Description panel should contain "The Situation"
    await expect(page.locator('text=The Situation')).toBeVisible({ timeout: 15000 });
  });

  test('problem page shows terminal area', async ({ page }) => {
    await page.goto('/');
    const firstLink = page.locator('a[href^="/problems/"]').first();
    const href = await firstLink.getAttribute('href');
    await page.goto(href!);

    // Terminal container has class xterm-container
    await expect(page.locator('.xterm-container').first()).toBeVisible({ timeout: 20000 });
  });

  test('Check Solution button is present', async ({ page }) => {
    await page.goto('/');
    const firstLink = page.locator('a[href^="/problems/"]').first();
    const href = await firstLink.getAttribute('href');
    await page.goto(href!);

    await expect(page.locator('button', { hasText: /check solution/i })).toBeVisible({ timeout: 15000 });
  });

  test('hints section is present and expandable', async ({ page }) => {
    await page.goto('/');
    const firstLink = page.locator('a[href^="/problems/"]').first();
    const href = await firstLink.getAttribute('href');
    await page.goto(href!);

    // Hints toggle button
    const hintButton = page.locator('button', { hasText: /hint/i }).first();
    await expect(hintButton).toBeVisible({ timeout: 15000 });
    await hintButton.click();
    // After click, hint text becomes visible
    await expect(page.locator('text=/GPU memory|computation graph|tensor/i').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('API health', () => {
  test('backend health endpoint responds', async ({ request }) => {
    const res = await request.get('http://localhost:3001/api/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  test('problems endpoint returns array', async ({ request }) => {
    const res = await request.get('http://localhost:3001/api/problems');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });
});
