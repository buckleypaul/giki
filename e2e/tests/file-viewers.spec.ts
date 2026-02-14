import { test, expect } from '@playwright/test';

test.describe('File Viewers', () => {
  test('code files show syntax-highlighted view', async ({ page }) => {
    await page.goto('/src/main.go');

    // Should display code view
    const codeView = page.locator('.code-view');
    await expect(codeView).toBeVisible();

    // Check for syntax highlighting
    const codeContent = page.locator('.code-view-content code');
    await expect(codeContent).toBeVisible();
    await expect(codeContent).toContainText('package main');
  });

  test('images display with img tag', async ({ page }) => {
    await page.goto('/docs/screenshot.png');

    // Should display image
    const img = page.locator('img[src*="screenshot.png"]');
    await expect(img).toBeVisible();
  });

  test('binary files show binary card', async ({ page }) => {
    await page.goto('/binary.dat');

    // Should show binary card
    const binaryCard = page.locator('.binary-card');
    await expect(binaryCard).toBeVisible();

    // Should have message about binary file
    await expect(page.locator('.binary-card-message')).toContainText('cannot be displayed');
  });
});
