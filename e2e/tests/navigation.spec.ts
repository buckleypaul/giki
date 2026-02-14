import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('root loads README', async ({ page }) => {
    await page.goto('/');

    // Should load README.md by default
    await expect(page.locator('h1')).toContainText('Test Repository');
    await expect(page.locator('#features')).toContainText('Features');
  });

  test('sidebar click loads file', async ({ page }) => {
    await page.goto('/');

    // Expand docs directory first
    const docsDir = page.locator('.tree-item-name', { hasText: 'docs' });
    await docsDir.click();

    // Wait for expansion
    await page.waitForTimeout(300);

    // Click on guide.md in the sidebar
    const guideFile = page.locator('.tree-item-name', { hasText: 'guide.md' });
    await guideFile.click();

    // Should navigate to guide.md
    await expect(page).toHaveURL(/\/docs\/guide\.md$/);
    await expect(page.locator('h1')).toContainText('User Guide');
  });

  test('back/forward navigation works', async ({ page }) => {
    await page.goto('/');

    // Expand docs directory first
    const docsDir = page.locator('.tree-item-name', { hasText: 'docs' });
    await docsDir.click();
    await page.waitForTimeout(300);

    // Navigate to guide
    const guideFile = page.locator('.tree-item-name', { hasText: 'guide.md' });
    await guideFile.click();
    await expect(page.locator('h1')).toContainText('User Guide');

    // Navigate to api.md (should still be expanded)
    const apiFile = page.locator('.tree-item-name', { hasText: 'api.md' });
    await apiFile.click();
    await expect(page.locator('h1')).toContainText('API Documentation');

    // Go back
    await page.goBack();
    await expect(page.locator('h1')).toContainText('User Guide');

    // Go forward
    await page.goForward();
    await expect(page.locator('h1')).toContainText('API Documentation');
  });
});
