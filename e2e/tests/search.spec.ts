import { test, expect } from '@playwright/test';

test.describe('Search', () => {
  test('filename search works', async ({ page }) => {
    await page.goto('/');

    // Open search with Cmd+K (Mac) or Ctrl+K (other)
    await page.keyboard.press('Meta+k');

    // Type filename
    const searchInput = page.locator('.search-panel-input');
    await searchInput.fill('guide');

    // Wait for results
    await page.waitForTimeout(500);

    // Results should include guide.md
    await expect(page.locator('text=guide.md')).toBeVisible();
  });

  test('content search works', async ({ page }) => {
    await page.goto('/');

    // Open search with Cmd+K (Mac) or Ctrl+K (other)
    await page.keyboard.press('Meta+k');

    // Switch to content search
    const contentButton = page.locator('button:has-text("Content")');
    await contentButton.click();

    // Search for content
    const searchInput = page.locator('.search-panel-input');
    await searchInput.fill('Getting Started');

    // Wait for results
    await page.waitForTimeout(500);

    // Should find results in guide.md
    await expect(page.locator('.search-result-path', { hasText: 'guide.md' })).toBeVisible();
  });

  test('clicking search result navigates to file', async ({ page }) => {
    await page.goto('/');

    // Open search with Cmd+K (Mac) or Ctrl+K (other)
    await page.keyboard.press('Meta+k');

    const searchInput = page.locator('.search-panel-input');
    await searchInput.fill('api');

    // Wait for results
    await page.waitForTimeout(500);

    // Click on api.md result
    const result = page.locator('.search-result-item', { hasText: 'api.md' });
    await result.click();

    // Should navigate to api.md
    await expect(page).toHaveURL(/\/docs\/api\.md$/);
  });
});
