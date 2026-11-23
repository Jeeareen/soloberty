import { test, expect } from '@playwright/test';

test.describe('Primary Onboarding & Signup Flow E2E', () => {
  test('walks user through full 7-step wizard and redirects to /feed', async ({ page, context }) => {
    // Grant geolocation permissions
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 48.2082, longitude: 16.3738 });

    // Enable E2E Firestore mock flag before app scripts execute
    await page.addInitScript(() => {
      (window as unknown as { __E2E_MOCK_FIRESTORE__?: boolean }).__E2E_MOCK_FIRESTORE__ = true;
    });

    const uniqueEmail = `testuser_${Date.now()}@example.com`;
    const mockUid = 'e2e-mock-uid-12345';
    const encodeBase64Url = (obj: Record<string, unknown>) =>
      Buffer.from(JSON.stringify(obj)).toString('base64url');
    const nowSec = Math.floor(Date.now() / 1000);
    const mockIdToken = [
      encodeBase64Url({ alg: 'RS256', typ: 'JWT' }),
      encodeBase64Url({
        iss: 'https://securetoken.google.com/mock-project',
        aud: 'mock-project',
        auth_time: nowSec,
        user_id: mockUid,
        sub: mockUid,
        iat: nowSec,
        exp: nowSec + 3600,
        email: uniqueEmail,
        email_verified: false,
      }),
      'mock-signature',
    ].join('.');

    // Intercept Firebase Auth & Firestore requests so CI never writes test accounts to the live DB
    await page.route('**/identitytoolkit.googleapis.com/**', async (route) => {
      const url = route.request().url();
      if (url.includes('accounts:signUp')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            kind: 'identitytoolkit#SignupNewUserResponse',
            idToken: mockIdToken,
            email: uniqueEmail,
            refreshToken: 'mock-refresh-token',
            expiresIn: '3600',
            localId: mockUid,
          }),
        });
      }
      if (url.includes('accounts:lookup')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            kind: 'identitytoolkit#GetAccountInfoResponse',
            users: [{ localId: mockUid, email: uniqueEmail, emailVerified: false }],
          }),
        });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    await page.route('**/securetoken.googleapis.com/**', async (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: mockIdToken,
          expires_in: '3600',
          token_type: 'Bearer',
          refresh_token: 'mock-refresh-token',
          id_token: mockIdToken,
          user_id: mockUid,
          project_id: 'mock-project',
        }),
      });
    });

    await page.route('**/firestore.googleapis.com/**', async (route) => {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

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
