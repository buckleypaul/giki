import { test, expect } from '@playwright/test';

test.describe('URL Routing', () => {
  test('direct URL navigation works', async ({ page }) => {
    // Navigate directly to a file
    await page.goto('/docs/guide.md');

    await expect(page.locator('h1')).toContainText('User Guide');
  });

  test('404 for non-existent file', async ({ page }) => {
    await page.goto('/this-file-does-not-exist.md');

    // Should show 404 or error message
    await expect(page.locator('text=/not found|404/i')).toBeVisible();
  });

  test('directory listing shows README or directory view', async ({ page }) => {
    await page.goto('/docs');

    // Should either show docs directory contents or redirect to README
    // The file tree should be visible
    await expect(page.locator('text=guide.md')).toBeVisible();
  });
});
