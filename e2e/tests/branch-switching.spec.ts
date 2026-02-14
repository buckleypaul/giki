import { test, expect } from '@playwright/test';

test.describe('Branch Switching', () => {
  test('branch dropdown works', async ({ page }) => {
    await page.goto('/');

    // Find and click branch selector
    const branchSelector = page.locator('[data-testid="branch-selector"], .branch-selector, select');
    await expect(branchSelector).toBeVisible();

    // Should show current branch (main)
    await expect(branchSelector).toContainText(/main/i);
  });

  test('switching branches updates tree', async ({ page }) => {
    await page.goto('/');

    // Switch to feature-branch
    const branchSelector = page.locator('.branch-selector');
    await branchSelector.selectOption('feature-branch');

    // Wait for tree to update
    await page.waitForTimeout(1000);

    // Expand docs directory on feature branch
    const docsDir = page.locator('.tree-item-name', { hasText: 'docs' });
    await docsDir.click();
    await page.waitForTimeout(300);

    // Feature branch has docs/feature.md
    await expect(page.locator('.tree-item-name', { hasText: 'feature.md' })).toBeVisible();
  });

  test('missing file on branch switch redirects to root', async ({ page }) => {
    // Start at root to ensure app is loaded
    await page.goto('/');
    await page.waitForTimeout(500);

    // Navigate to CHANGELOG.md on main branch
    await page.goto('/CHANGELOG.md');
    await expect(page.locator('h1')).toContainText('Changelog', { timeout: 10000 });

    // Switch to feature-branch (which doesn't have CHANGELOG.md)
    const branchSelector = page.locator('.branch-selector');
    await branchSelector.selectOption('feature-branch');

    // Wait for redirect
    await page.waitForTimeout(1000);

    // Should redirect to root (/)
    await expect(page).toHaveURL(/\/$|\/README\.md$/);
  });
});
