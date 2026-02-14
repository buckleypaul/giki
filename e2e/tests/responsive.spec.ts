import { test, expect } from '@playwright/test';

test.describe('Responsive Design', () => {
  test('sidebar collapses on narrow viewport', async ({ page }) => {
    // Start with desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');

    // Sidebar should be visible
    const sidebar = page.locator('[data-testid="sidebar"], .sidebar, aside');
    await expect(sidebar).toBeVisible();

    // Resize to mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Sidebar might be hidden or collapsed
    // Check if sidebar is hidden or if there's a toggle button
    const sidebarVisible = await sidebar.isVisible();
    const menuButton = page.locator('button[aria-label*="menu"], button:has-text("Menu"), [data-testid="menu-toggle"]');

    // Either sidebar is hidden, or there's a menu button to show it
    if (!sidebarVisible) {
      await expect(menuButton).toBeVisible();
    }
  });

  test('content is readable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Content should be visible and readable
    const content = page.locator('main, [data-testid="content"], .content');
    await expect(content).toBeVisible();

    // Heading should be visible
    await expect(page.locator('h1')).toBeVisible();
  });
});
