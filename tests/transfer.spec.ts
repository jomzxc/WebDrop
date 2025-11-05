import { test, expect } from '@playwright/test';
import path from 'path';
import { USER_1_STATE, USER_2_STATE } from '../playwright.config';

// This test uses two authenticated browser contexts.

test.describe('File Transfer (P2P)', () => {

  const testFilePath = path.join(__dirname, 'fixtures/test-file.txt');

  test('should send and receive a file between two peers', async ({ browser }) => {
    // --- Setup Sender (User 1) ---
    const senderContext = await browser.newContext({ storageState: USER_1_STATE });
    const senderPage = await senderContext.newPage();

    // --- Setup Receiver (User 2) ---
    const receiverContext = await browser.newContext({ storageState: USER_2_STATE });
    const receiverPage = await receiverContext.newPage();

    try {
      // 1. (Sender) Go to room and create
      await senderPage.goto('/room');
      await senderPage.getByRole('button', { name: 'Create New Room' }).click();
      await expect(senderPage.locator('text=Connected Room')).toBeVisible({ timeout: 10000 });

      // 2. (Sender) Get Room ID and Receiver's username
      const roomId = await senderPage.locator('.font-mono.text-3xl').textContent();
      expect(roomId).toBeTruthy();

      await senderPage.getByRole('button', { name: 'User avatar' }).click();
      const senderUsername = await senderPage.locator('.text-sm.font-medium').textContent();
      await senderPage.keyboard.press('Escape');

      await receiverPage.getByRole('button', { name: 'User avatar' }).click();
      const receiverUsername = await receiverPage.locator('.text-sm.font-medium').textContent();
      await receiverPage.keyboard.press('Escape');

      // 3. (Receiver) Go to room and join
      await receiverPage.goto('/room');
      await receiverPage.getByPlaceholder('Enter room ID').fill(roomId!);
      await receiverPage.getByRole('button', { name: 'Join Room' }).click();

      // 4. Wait for peers to connect (WebRTC can take a moment)
      // Sender asserts Receiver is 'Live'
      await expect(senderPage.locator(`div:has-text("${receiverUsername}")`).getByText('Live')).toBeVisible({ timeout: 20000 });
      // Receiver asserts Sender is 'Live'
      await expect(receiverPage.locator(`div:has-text("${senderUsername}")`).getByText('Live')).toBeVisible({ timeout: 20000 });

      // 5. (Sender) Select file, recipient, and send
      await senderPage.locator('input[type="file"]').setInputFiles(testFilePath);
      await expect(senderPage.locator('text=1 file selected')).toBeVisible();

      await senderPage.locator('button[role="combobox"]').click();
      await senderPage.getByRole('option', { name: receiverUsername! }).click();
      await senderPage.getByRole('button', { name: 'Send' }).click();

      // 6. (Sender) Assert send is complete
      await expect(senderPage.locator('text=File sent')).toBeVisible({ timeout: 15000 });
      await expect(senderPage.locator('div[role="alert"] div:has-text("100%")')).toBeVisible();

      // 7. (Receiver) Assert file is received
      // The app shows a toast on success
      await expect(receiverPage.locator('text=File received')).toBeVisible({ timeout: 15000 });
      await expect(receiverPage.locator('div[role="alert"] div:has-text("100%")')).toBeVisible();
      await expect(receiverPage.locator('div[role="alert"] div:has-text("test-file.txt")')).toBeVisible();

    } finally {
      // Clean up contexts
      await senderContext.close();
      await receiverContext.close();
    }
  });
});