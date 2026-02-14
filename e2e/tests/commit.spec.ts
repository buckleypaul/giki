import { test, expect } from '@playwright/test';

test.describe('Commit', () => {
  test('can commit changes', async ({ page }) => {
    await page.goto('/README.md');

    // Edit file
    await page.click('.markdown-edit-button');
    const editor = page.locator('.cm-editor');
    await editor.click();
    await page.keyboard.type('\n\nE2E test commit content');

    // Save changes
    const saveButton = page.locator('.editor-save');
    await saveButton.click();

    // Wait for pending badge to appear
    await page.waitForTimeout(500);

    // Click pending changes badge to open dialog
    const pendingBadge = page.locator('.topbar-pending-badge');
    await pendingBadge.click();

    // Click "Commit..." button in pending changes dialog
    const commitButton = page.locator('button:has-text("Commit...")');
    await commitButton.click();

    // Fill commit message in commit dialog
    const messageInput = page.locator('#commit-message');
    await messageInput.fill('E2E test commit');

    // Submit commit
    const submitButton = page.locator('button:has-text("Commit")').last();
    await submitButton.click();

    // Wait for commit to complete
    await page.waitForTimeout(1000);

    // Pending changes badge should be gone
    await expect(pendingBadge).not.toBeVisible();
  });
});
