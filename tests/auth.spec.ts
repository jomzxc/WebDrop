import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {

  test('should sign out successfully', async ({ page }) => {
    // Page starts authenticated due to `storageState`
    await page.goto('/room');

    // Check that we are logged in
    await expect(page.getByRole('button', { name: 'User avatar' })).toBeVisible();

    // Sign out
    await page.getByRole('button', { name: 'User avatar' }).click();
    await page.getByRole('menuitem', { name: 'Sign Out' }).click();

    // Assert redirection to login
    await expect(page).toHaveURL('/auth/login');
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('should sign in successfully', async ({ page, context }) => {
    // 1. Get User 1's credentials from the auth setup
    // Note: This is a simplified way. In a real setup, you'd pull this
    // from the `global.setup.ts` state or a shared file.
    // For this example, we'll read the email from the storage state (which is not ideal, but works)
    // A better way is to write the email/password to a .env file from global.setup.

    // For simplicity, we'll just log out and log back in
    await page.goto('/room');
    const userAvatar = page.getByRole('button', { name: 'User avatar' });
    await expect(userAvatar).toBeVisible();

    // Get email
    await userAvatar.click();
    const userEmail = await page.locator('p.text-xs.leading-none.text-muted-foreground').textContent();
    await page.keyboard.press('Escape'); // Close dropdown

    // Sign out
    await userAvatar.click();
    await page.getByRole('menuitem', { name: 'Sign Out' }).click();
    await expect(page).toHaveURL('/auth/login');

    // Sign back in
    await page.getByLabel('Email').fill(userEmail!);
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign in with Email' }).click();

    // Assert successful login
    await expect(page).toHaveURL('/room');
    await expect(userAvatar).toBeVisible();
  });

});