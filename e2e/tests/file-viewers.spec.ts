import { test, expect } from '@playwright/test';

test.describe('File Viewers', () => {
  test('code files show syntax-highlighted view', async ({ page }) => {
    await page.goto('/src/main.go');

    // Should display code with syntax highlighting
    const codeBlock = page.locator('pre code, .code-view');
    await expect(codeBlock).toBeVisible();
    await expect(codeBlock).toContainText('package main');
    await expect(codeBlock).toContainText('func main()');
  });

  test('images display with img tag', async ({ page }) => {
    await page.goto('/docs/screenshot.png');

    // Should display image
    const img = page.locator('img[src*="screenshot.png"]');
    await expect(img).toBeVisible();
  });

  test('binary files show binary card', async ({ page }) => {
    await page.goto('/binary.dat');

    // Should show binary file indicator/card
    // This might be a message or icon indicating binary file
    await expect(page.locator('text=/binary|cannot display|download/i')).toBeVisible();
  });
});
