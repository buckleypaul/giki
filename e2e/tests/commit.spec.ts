import { test, expect } from '@playwright/test';

test.describe('Commit', () => {
  test('can commit changes', async ({ page }) => {
    await page.goto('/README.md');

    // Edit file
    await page.click('button:has-text("Edit"), [data-testid="edit-button"]');
    const editor = page.locator('.cm-editor, [data-testid="editor"]');
    await editor.click();
    await page.keyboard.type('\n\nE2E test commit content');

    // Save changes
    const saveButton = page.locator('button:has-text("Save"), button:has-text("Done")');
    if (await saveButton.isVisible()) {
      await saveButton.click();
    }

    // Open commit dialog
    const commitButton = page.locator('button:has-text("Commit"), [data-testid="commit-button"]');
    await commitButton.click();

    // Fill commit message
    const messageInput = page.locator('input[placeholder*="message"], textarea[placeholder*="message"], [data-testid="commit-message"]');
    await messageInput.fill('E2E test commit');

    // Submit commit
    const submitButton = page.locator('button:has-text("Commit"), button:has-text("Create commit")').last();
    await submitButton.click();

    // Pending changes should be cleared
    await page.waitForTimeout(1000);
    const pendingIndicator = page.locator('[data-testid="pending-changes"]');
    await expect(pendingIndicator).not.toBeVisible();
  });
});
