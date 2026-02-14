import { test, expect } from '@playwright/test';

test.describe('Theme Toggle', () => {
  test('can toggle theme', async ({ page }) => {
    await page.goto('/');

    // Find theme toggle button
    const themeToggle = page.locator('button[aria-label*="theme"], button:has-text("Light"), button:has-text("Dark"), [data-testid="theme-toggle"]');
    await expect(themeToggle).toBeVisible();

    // Get initial theme
    const htmlElement = page.locator('html');
    const initialClass = await htmlElement.getAttribute('class');

    // Toggle theme
    await themeToggle.click();

    // Wait for theme change
    await page.waitForTimeout(300);

    // Theme should have changed
    const newClass = await htmlElement.getAttribute('class');
    expect(newClass).not.toBe(initialClass);
  });

  test('theme persists on reload', async ({ page }) => {
    await page.goto('/');

    // Toggle to dark theme
    const themeToggle = page.locator('button[aria-label*="theme"], button:has-text("Light"), button:has-text("Dark"), [data-testid="theme-toggle"]');

    // Make sure we're on light theme first
    const htmlElement = page.locator('html');
    let currentClass = await htmlElement.getAttribute('class');

    // Toggle to dark if we're on light
    if (!currentClass?.includes('dark')) {
      await themeToggle.click();
      await page.waitForTimeout(300);
    }

    // Get dark theme class
    const darkClass = await htmlElement.getAttribute('class');

    // Reload page
    await page.reload();

    // Theme should persist
    const reloadedClass = await htmlElement.getAttribute('class');
    expect(reloadedClass).toBe(darkClass);
  });
});
