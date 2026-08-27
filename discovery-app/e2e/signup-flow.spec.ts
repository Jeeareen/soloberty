import { test, expect } from '@playwright/test';

test.describe('Primary Onboarding & Signup Flow E2E', () => {
  test('walks user through full 7-step wizard and redirects to /feed', async ({ page, context }) => {
    // Grant geolocation permissions
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 48.2082, longitude: 16.3738 });

    const uniqueEmail = `testuser_${Date.now()}@example.com`;

    // 1. Navigate to signup page
    await page.goto('/auth/signup');

    // Verify page header
    await expect(page.getByText(/Soloberty Onboarding/i)).toBeVisible();

    // Step 1: Email & Password
    await page.fill('#signup-email', uniqueEmail);
    await page.fill('#signup-password', 'Password123!');
    await page.fill('#signup-confirm-password', 'Password123!');
    await page.getByRole('button', { name: /continue/i }).click();

    // Step 2: Name, Age, Gender
    await expect(page.getByText('Step 2 of 7')).toBeVisible({ timeout: 10000 });
    await page.fill('#signup-name', 'Alex Johnson');
    await page.fill('#signup-age', '28');
    await page.getByRole('button', { name: 'Male', exact: true }).click();
    await page.getByRole('button', { name: /continue/i }).click();

    // Step 3: Primary Interest
    await expect(page.getByText('Step 3 of 7')).toBeVisible();
    await page.getByRole('button', { name: /tech & coding/i }).click();
    await page.getByRole('button', { name: /continue/i }).click();

    // Step 4: Bio
    await expect(page.getByText('Step 4 of 7')).toBeVisible();
    await page.fill('#signup-bio', 'I am a passionate software engineer who loves web development, AI, and exploring nature.');
    await page.getByRole('button', { name: /continue/i }).click();

    // Step 5: Location
    await expect(page.getByText('Step 5 of 7')).toBeVisible();
    await page.getByRole('button', { name: /exact location/i }).click();
    await page.getByRole('button', { name: /detect current location via gps/i }).click();
    await page.getByRole('button', { name: /continue/i }).click();

    // Step 6: Profile Photo (Skip)
    await expect(page.getByText('Step 6 of 7')).toBeVisible();
    await page.getByRole('button', { name: /skip/i }).click();

    // Step 7: Final Profile Save
    await expect(page.getByText('Step 7 of 7')).toBeVisible();
    await page.getByRole('button', { name: /complete registration/i }).click();

    // Verify successful redirection to /feed or /discover
    await expect(page).toHaveURL(/\/(feed|discover)/, { timeout: 15000 });
  });
});
