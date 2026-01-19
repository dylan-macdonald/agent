import { test, expect } from '@playwright/test';

/**
 * Sample E2E Test - Health Check
 *
 * NOTE: This test requires Playwright browsers to be installed.
 * In restricted environments, browser installation may fail.
 * Run `npx playwright install` to install browsers locally.
 */

test.describe('Health Check', () => {
  test('should return healthy status', async ({ page }) => {
    await page.goto('/health');

    const response = await page.textContent('body');
    expect(response).toContain('healthy');
  });
});

test.describe('Basic Navigation', () => {
  test('should load home page', async ({ page }) => {
    await page.goto('/');

    // Check page loaded
    await expect(page).toHaveTitle(/AI Personal Assistant/i);
  });
});
