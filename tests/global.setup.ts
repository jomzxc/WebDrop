import { test as setup, expect } from '@playwright/test';
import { USER_1_STATE, USER_2_STATE } from '../playwright.config';
import { generateTestEmail, waitForEmail, extractConfirmationLink } from './utils/testmail.helper';

// Skip entire setup if required env vars are missing
const MISSING_TESTMAIL_ENV = !process.env.TESTMAIL_NAMESPACE || !process.env.TESTMAIL_API_KEY;
setup.skip(MISSING_TESTMAIL_ENV, 'TESTMAIL_NAMESPACE/TESTMAIL_API_KEY not set. Setup is skipped.');

// --- Reusable Sign-Up Function ---
async function signUpAndConfirm(page: any) {
  const { tag, email } = generateTestEmail();
  const password = 'password123';
  const username = tag;

  // 1. Navigate to sign-up
  await page.goto('/auth/sign-up');

  // 2. Fill and submit form
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByLabel('Confirm Password').fill(password);
  await page.getByRole('button', { name: 'Sign up with Email' }).click();

  // 3. Wait for success page
  await expect(page).toHaveURL('/auth/sign-up-success');

  // 4. Get confirmation email (allow up to 60s)
  const received = await waitForEmail(tag, 60000);
  const emailBody: string = received?.html || received?.text || '';
  const confirmationLink = extractConfirmationLink(emailBody);

  // 5. Visit confirmation link
  await page.goto(confirmationLink);

  // 6. Should be redirected to the app
  await expect(page).toHaveURL('/room');
  await expect(page.getByLabel('Toggle dark mode')).toBeVisible(); // Wait for page to load

  return { email, password, username };
}

// --- Setup ---
setup.describe('Global Auth Setup', () => {

  setup('create user 1', async ({ page }) => {
    await signUpAndConfirm(page);
    await page.context().storageState({ path: USER_1_STATE });
  });

  setup('create user 2', async ({ page }) => {
    await signUpAndConfirm(page);
    await page.context().storageState({ path: USER_2_STATE });
  });

});