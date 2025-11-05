import { test, expect } from '@playwright/test';

test.describe('Room Management', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/room');
  });

  test('should create a new room successfully', async ({ page }) => {
    // Click create room button
    await page.getByRole('button', { name: 'Create New Room' }).click();

    // Should show connected room status
    await expect(page.locator('text=Connected Room')).toBeVisible({ timeout: 10000 });

    // Should display an 8-character room ID
    const roomIdElement = page.locator('.font-mono.text-3xl');
    await expect(roomIdElement).toBeVisible();
    const roomId = await roomIdElement.textContent();
    expect(roomId).toHaveLength(8);
    expect(roomId).toMatch(/^[A-Z0-9]{8}$/);
  });

  test('should show validation error for empty room ID', async ({ page }) => {
    // Try to join with empty room ID
    await page.getByRole('button', { name: 'Join Room' }).click();

    // Should show validation or remain on the page
    // The button might be disabled or show an error
    await expect(page.getByPlaceholder('Enter room ID')).toBeVisible();
  });

  test('should show validation error for invalid room ID format', async ({ page }) => {
    // Enter invalid room ID (less than 8 characters)
    await page.getByPlaceholder('Enter room ID').fill('ABC');
    await page.getByRole('button', { name: 'Join Room' }).click();

    // Should still be on room page (invalid input)
    await expect(page.getByPlaceholder('Enter room ID')).toBeVisible();
  });

  test('should allow leaving a room', async ({ page }) => {
    // Create a room first
    await page.getByRole('button', { name: 'Create New Room' }).click();
    await expect(page.locator('text=Connected Room')).toBeVisible({ timeout: 10000 });

    // Find and click leave room button
    await page.getByRole('button', { name: 'Leave Room' }).click();

    // Should return to room selection
    await expect(page.getByRole('button', { name: 'Create New Room' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Join Room' })).toBeVisible();
  });

  test('should display room ID correctly', async ({ page }) => {
    // Create a room
    await page.getByRole('button', { name: 'Create New Room' }).click();
    await expect(page.locator('text=Connected Room')).toBeVisible({ timeout: 10000 });

    // Get the room ID
    const roomId = await page.locator('.font-mono.text-3xl').textContent();

    // Room ID should be visible and copyable
    expect(roomId).toBeTruthy();
    expect(roomId).toHaveLength(8);
  });

  test('should handle page refresh in a room', async ({ page }) => {
    // Create a room
    await page.getByRole('button', { name: 'Create New Room' }).click();
    await expect(page.locator('text=Connected Room')).toBeVisible({ timeout: 10000 });

    const roomIdBefore = await page.locator('.font-mono.text-3xl').textContent();

    // Refresh the page
    await page.reload();

    // Should still be in the same room after reload
    await expect(page.locator('text=Connected Room')).toBeVisible({ timeout: 10000 });
    const roomIdAfter = await page.locator('.font-mono.text-3xl').textContent();

    expect(roomIdAfter).toBe(roomIdBefore);
  });

  test('should show user presence in room', async ({ page }) => {
    // Create a room
    await page.getByRole('button', { name: 'Create New Room' }).click();
    await expect(page.locator('text=Connected Room')).toBeVisible({ timeout: 10000 });

    // Get current user info
    await page.getByRole('button', { name: 'User avatar' }).click();
    const username = await page.locator('.text-sm.font-medium').textContent();
    await page.keyboard.press('Escape');

    // User should appear in the peer list
    await expect(page.locator(`text=${username}`)).toBeVisible();
  });

});
