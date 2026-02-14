import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('root loads README', async ({ page }) => {
    await page.goto('/');

    // Should load README.md by default
    await expect(page.locator('h1')).toContainText('Test Repository');
    await expect(page.locator('h2')).toContainText('Features');
  });

  test('sidebar click loads file', async ({ page }) => {
    await page.goto('/');

    // Click on docs/guide.md in the sidebar
    await page.click('text=guide.md');

    // Should navigate to guide.md
    await expect(page).toHaveURL(/\/docs\/guide\.md$/);
    await expect(page.locator('h1')).toContainText('User Guide');
  });

  test('back/forward navigation works', async ({ page }) => {
    await page.goto('/');

    // Navigate to guide
    await page.click('text=guide.md');
    await expect(page.locator('h1')).toContainText('User Guide');

    // Navigate to api.md
    await page.click('text=api.md');
    await expect(page.locator('h1')).toContainText('API Documentation');

    // Go back
    await page.goBack();
    await expect(page.locator('h1')).toContainText('User Guide');

    // Go forward
    await page.goForward();
    await expect(page.locator('h1')).toContainText('API Documentation');
  });
});
