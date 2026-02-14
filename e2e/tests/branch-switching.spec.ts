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
    const branchSelector = page.locator('[data-testid="branch-selector"], .branch-selector, select');
    await branchSelector.click();
    await page.click('text=feature-branch');

    // Wait for tree to update
    await page.waitForTimeout(500);

    // Feature branch has docs/feature.md
    await expect(page.locator('text=feature.md')).toBeVisible();
  });

  test('missing file on branch switch redirects to root', async ({ page }) => {
    // Start on main branch viewing CHANGELOG.md
    await page.goto('/CHANGELOG.md');
    await expect(page.locator('h1')).toContainText('Changelog');

    // Switch to feature-branch (which doesn't have CHANGELOG.md)
    const branchSelector = page.locator('[data-testid="branch-selector"], .branch-selector, select');
    await branchSelector.click();
    await page.click('text=feature-branch');

    // Should redirect to root (/)
    await expect(page).toHaveURL(/\/$|\/README\.md$/);
  });
});
