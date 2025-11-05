import { test, expect } from '@playwright/test';

test.describe('User Interface', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/room');
  });

  test('should toggle dark mode', async ({ page }) => {
    // Get the theme toggle button
    const themeToggle = page.getByLabel('Toggle dark mode');
    await expect(themeToggle).toBeVisible();

    // Get initial theme (check HTML element)
    const htmlElement = page.locator('html');
    const initialClass = await htmlElement.getAttribute('class');
    const isDarkInitially = initialClass?.includes('dark');

    // Toggle theme
    await themeToggle.click();

    // Wait a moment for theme to update
    await page.waitForTimeout(500);

    // Check theme has changed
    const newClass = await htmlElement.getAttribute('class');
    const isDarkAfter = newClass?.includes('dark');

    expect(isDarkAfter).not.toBe(isDarkInitially);

    // Toggle back
    await themeToggle.click();
    await page.waitForTimeout(500);

    // Should return to original state
    const finalClass = await htmlElement.getAttribute('class');
    const isDarkFinal = finalClass?.includes('dark');
    expect(isDarkFinal).toBe(isDarkInitially);
  });

  test('should persist theme preference across page reloads', async ({ page }) => {
    const themeToggle = page.getByLabel('Toggle dark mode');
    const htmlElement = page.locator('html');

    // Toggle to a specific theme
    await themeToggle.click();
    await page.waitForTimeout(500);

    const themeAfterToggle = await htmlElement.getAttribute('class');

    // Reload page
    await page.reload();

    // Wait for page to fully load
    await expect(themeToggle).toBeVisible();
    await page.waitForTimeout(500);

    // Theme should be preserved
    const themeAfterReload = await htmlElement.getAttribute('class');
    expect(themeAfterReload).toBe(themeAfterToggle);
  });

  test('should navigate between pages', async ({ page }) => {
    // Should be on room page
    await expect(page).toHaveURL('/room');

    // Navigate to profile
    await page.getByRole('button', { name: 'User avatar' }).click();
    await page.getByRole('menuitem', { name: 'Profile' }).click();

    // Should be on profile page
    await expect(page).toHaveURL('/profile');
    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();

    // Navigate back to room
    await page.goto('/room');
    await expect(page).toHaveURL('/room');
  });

  test('should display header on all pages', async ({ page }) => {
    // Room page
    await expect(page.locator('header')).toBeVisible();

    // Profile page
    await page.goto('/profile');
    await expect(page.locator('header')).toBeVisible();
  });

  test('should display footer on main page', async ({ page }) => {
    await page.goto('/');
    
    // Footer should be visible
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('should show user dropdown menu', async ({ page }) => {
    // Click on user avatar
    await page.getByRole('button', { name: 'User avatar' }).click();

    // Menu items should be visible
    await expect(page.getByRole('menuitem', { name: 'Profile' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Sign Out' })).toBeVisible();

    // Close menu
    await page.keyboard.press('Escape');

    // Menu should be hidden
    await expect(page.getByRole('menuitem', { name: 'Profile' })).not.toBeVisible();
  });

  test('should handle responsive navigation', async ({ page, viewport }) => {
    // Test on desktop size
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.getByLabel('Toggle dark mode')).toBeVisible();

    // Test on mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    // UI should still be accessible
    await expect(page.getByRole('button', { name: 'User avatar' })).toBeVisible();
  });

  test('should display loading states', async ({ page }) => {
    // Create a room
    await page.getByRole('button', { name: 'Create New Room' }).click();

    // Should show some indication of connection
    // This might be a spinner or "Connecting..." text
    // Wait for successful connection
    await expect(page.locator('text=Connected Room')).toBeVisible({ timeout: 10000 });
  });

});
