import { test, expect } from '@playwright/test';

test.describe('Theme Toggle', () => {
  test('can toggle theme', async ({ page }) => {
    await page.goto('/');

    // Find theme toggle button
    const themeToggle = page.locator('.theme-toggle');
    await expect(themeToggle).toBeVisible();

    // Get initial theme
    const htmlElement = page.locator('html');
    const initialTheme = await htmlElement.getAttribute('data-theme');

    // Toggle theme
    await themeToggle.click();

    // Wait for theme change
    await page.waitForTimeout(300);

    // Theme should have changed
    const newTheme = await htmlElement.getAttribute('data-theme');
    expect(newTheme).not.toBe(initialTheme);
    expect(['light', 'dark']).toContain(newTheme);
  });

  test('theme persists on reload', async ({ page }) => {
    await page.goto('/');

    // Toggle to dark theme
    const themeToggle = page.locator('.theme-toggle');
    const htmlElement = page.locator('html');

    // Make sure we're on light theme first
    let currentTheme = await htmlElement.getAttribute('data-theme');

    // Toggle to dark if we're on light
    if (currentTheme === 'light') {
      await themeToggle.click();
      await page.waitForTimeout(300);
    }

    // Get current theme (should be dark now)
    const themeBeforeReload = await htmlElement.getAttribute('data-theme');

    // Reload page
    await page.reload();

    // Theme should persist
    const themeAfterReload = await htmlElement.getAttribute('data-theme');
    expect(themeAfterReload).toBe(themeBeforeReload);
  });
});
