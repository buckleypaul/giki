import { test, expect } from '@playwright/test';

test.describe('Search', () => {
  test('filename search works', async ({ page }) => {
    await page.goto('/');

    // Open search
    const searchButton = page.locator('button:has-text("Search"), [data-testid="search-button"]');
    await searchButton.click();

    // Type filename
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], [data-testid="search-input"]');
    await searchInput.fill('guide');

    // Results should include guide.md
    await expect(page.locator('text=guide.md')).toBeVisible();
  });

  test('content search works', async ({ page }) => {
    await page.goto('/');

    // Open search
    const searchButton = page.locator('button:has-text("Search"), [data-testid="search-button"]');
    await searchButton.click();

    // Search for content
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], [data-testid="search-input"]');
    await searchInput.fill('Getting Started');

    // Should find results in guide.md
    await expect(page.locator('text=/guide\.md|User Guide/i')).toBeVisible();
  });

  test('clicking search result navigates to file', async ({ page }) => {
    await page.goto('/');

    // Open search and search
    const searchButton = page.locator('button:has-text("Search"), [data-testid="search-button"]');
    await searchButton.click();

    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]');
    await searchInput.fill('api');

    // Click on api.md result
    await page.click('text=api.md');

    // Should navigate to api.md
    await expect(page).toHaveURL(/\/docs\/api\.md$/);
  });
});
