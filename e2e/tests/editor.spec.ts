import { test, expect } from '@playwright/test';

test.describe('Editor', () => {
  test('can open file in editor', async ({ page }) => {
    await page.goto('/README.md');

    // Click edit button
    const editButton = page.locator('button:has-text("Edit"), [data-testid="edit-button"]');
    await editButton.click();

    // Editor should appear
    const editor = page.locator('.cm-editor, [data-testid="editor"]');
    await expect(editor).toBeVisible();
  });

  test('can type in editor', async ({ page }) => {
    await page.goto('/README.md');

    // Open editor
    await page.click('button:has-text("Edit"), [data-testid="edit-button"]');

    // Wait for editor
    const editor = page.locator('.cm-editor, [data-testid="editor"]');
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
    await page.click('button:has-text("Edit"), [data-testid="edit-button"]');
    const editor = page.locator('.cm-editor, [data-testid="editor"]');
    await editor.click();
    await page.keyboard.type('\n\nPending change');

    // Save/close editor to see pending indicator
    const saveButton = page.locator('button:has-text("Save"), button:has-text("Done"), [data-testid="save-button"]');
    if (await saveButton.isVisible()) {
      await saveButton.click();
    }

    // Pending changes indicator should appear
    const pendingIndicator = page.locator('text=/pending|modified|unsaved/i, [data-testid="pending-changes"]');
    await expect(pendingIndicator).toBeVisible();
  });
});
