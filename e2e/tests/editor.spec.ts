import { test, expect } from '@playwright/test';

test.describe('Editor', () => {
  test('can open file in editor', async ({ page }) => {
    await page.goto('/README.md');

    // Click edit button
    const editButton = page.locator('.markdown-edit-button');
    await editButton.click();

    // Editor should appear
    const editor = page.locator('.cm-editor');
    await expect(editor).toBeVisible();
  });

  test('can type in editor', async ({ page }) => {
    await page.goto('/README.md');

    // Open editor
    await page.click('.markdown-edit-button');

    // Wait for editor
    const editor = page.locator('.cm-editor');
    await expect(editor).toBeVisible();

    // Type in editor
    await editor.click();
    await page.keyboard.type('\n\nNew content from E2E test');

    // Content should be visible in editor
    await expect(editor).toContainText('New content from E2E test');
  });

  test('pending changes appear in UI', async ({ page }) => {
    await page.goto('/README.md');

    // Open editor and make changes
    await page.click('.markdown-edit-button');
    const editor = page.locator('.cm-editor');
    await editor.click();
    await page.keyboard.type('\n\nPending change');

    // Save changes
    const saveButton = page.locator('.editor-save');
    await saveButton.click();

    // Pending changes badge should appear in top bar
    const pendingBadge = page.locator('.topbar-pending-badge');
    await expect(pendingBadge).toBeVisible();
    await expect(pendingBadge).toContainText('1');
  });
});
