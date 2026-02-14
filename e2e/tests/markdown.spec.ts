import { test, expect } from '@playwright/test';

test.describe('Markdown Rendering', () => {
  test('renders GFM table correctly', async ({ page }) => {
    await page.goto('/');

    // README contains a table
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // Check table headers
    await expect(table.locator('th').nth(0)).toContainText('Feature');
    await expect(table.locator('th').nth(1)).toContainText('Status');

    // Check table data
    await expect(table.locator('td').first()).toContainText('Navigation');
  });

  test('renders code blocks with syntax highlighting', async ({ page }) => {
    await page.goto('/');

    // README contains a Go code block
    const codeBlock = page.locator('pre code');
    await expect(codeBlock.first()).toBeVisible();
    await expect(codeBlock.first()).toContainText('func main()');
  });

  test('relative links trigger SPA navigation', async ({ page }) => {
    await page.goto('/');

    // Click relative link to docs/guide.md (rendered as /docs/guide.md by React Router)
    await page.click('a[href="/docs/guide.md"]');

    // Should navigate via SPA (no full page reload)
    await expect(page).toHaveURL(/\/docs\/guide\.md$/);
    await expect(page.locator('h1')).toContainText('User Guide');
  });

  test('nested relative links work correctly', async ({ page }) => {
    await page.goto('/docs/guide.md');

    // Click link to api.md (same directory)
    await page.click('a:has-text("API documentation")');
    await expect(page).toHaveURL(/\/docs\/api\.md$/);
    await expect(page.locator('h1')).toContainText('API Documentation');

    // Click link back to README (parent directory)
    await page.click('a:has-text("README")');
    await expect(page).toHaveURL(/\/README\.md$|\/$/);
    await expect(page.locator('h1')).toContainText('Test Repository');
  });
});
