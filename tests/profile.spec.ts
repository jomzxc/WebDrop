import { test, expect } from '@playwright/test';
import path from 'path';
import { randomUUID } from 'crypto';

test.describe('Profile Management', () => {

  const testAvatarPath = path.join(__dirname, 'fixtures/test-avatar.png');
  const newUsername = `TestUser-${randomUUID().split('-')[0]}`;

  test.beforeEach(async ({ page }) => {
    // All tests start authenticated (User 1) and on the profile page
    await page.goto('/profile');
  });

  test('should update username', async ({ page }) => {
    // 1. Update username
    await page.getByLabel('Username').fill(newUsername);
    await page.getByRole('button', { name: 'Save Changes' }).click();

    // 2. Check for success toast
    await expect(page.locator('text=Profile updated successfully!')).toBeVisible();

    // 3. Reload page to ensure persistence
    await page.reload();

    // 4. Assert new username is saved
    await expect(page.getByLabel('Username')).toHaveValue(newUsername);
  });

  test('should upload a new avatar', async ({ page }) => {
    // 1. Set up file input
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Choose Image' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(testAvatarPath);

    // 2. Wait for upload to complete
    await expect(page.getByRole('button', { name: 'Uploading...' })).toBeVisible();
    await expect(page.locator('text=Avatar updated successfully!')).toBeVisible({ timeout: 10000 });

    // 3. Get the new avatar URL
    const avatarImg = page.locator('.h-24.w-24 img');
    const newAvatarSrc = await avatarImg.getAttribute('src');

    // 4. Assert the new URL is from Supabase storage and not the placeholder
    expect(newAvatarSrc).not.toContain('placeholder.svg');
    expect(newAvatarSrc).toContain('supabase.co');
  });
});