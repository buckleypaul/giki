import { test, expect } from '@playwright/test';

test.describe('File Tree', () => {
  test('displays directories before files', async ({ page }) => {
    await page.goto('/');

    // Get all items in the file tree
    const items = page.locator('.tree-item');

    // Verify tree is visible
    await expect(items.first()).toBeVisible();

    // Directories should appear (docs/, src/)
    await expect(page.locator('.tree-item-name', { hasText: 'docs' })).toBeVisible();
    await expect(page.locator('.tree-item-name', { hasText: 'src' })).toBeVisible();
  });

  test('expands and collapses directories', async ({ page }) => {
    await page.goto('/');

    // Find the docs directory
    const docsDir = page.locator('text=docs').first();
    await expect(docsDir).toBeVisible();

    // Click to expand if not already expanded
    await docsDir.click();

    // Children should be visible
    await expect(page.locator('text=guide.md')).toBeVisible();
    await expect(page.locator('text=api.md')).toBeVisible();
  });

  test('gitignored files are hidden', async ({ page }) => {
    await page.goto('/');

    // ignored-dir and secret.key should NOT appear
    await expect(page.locator('text=ignored-dir')).not.toBeVisible();
    await expect(page.locator('text=secret.key')).not.toBeVisible();
    await expect(page.locator('text=should-not-appear.txt')).not.toBeVisible();
  });
});
