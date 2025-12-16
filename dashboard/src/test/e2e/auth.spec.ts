import { test, expect } from '@playwright/test';

test.describe('Authentication E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login form on initial load', async ({ page }) => {
    // Should show login page
    await expect(page.getByText('Server Monitor Dashboard')).toBeVisible();
    await expect(page.getByLabel(/username/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should show validation errors for empty form submission', async ({
    page,
  }) => {
    // Click submit without filling form
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should show validation errors
    await expect(page.getByText(/username is required/i)).toBeVisible();
    await expect(page.getByText(/password is required/i)).toBeVisible();
  });

  test('should handle login flow with valid credentials', async ({ page }) => {
    // Mock successful login API response
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'test-token',
          token_type: 'bearer',
          expires_in: 3600,
          user: {
            id: '1',
            username: 'testuser',
            email: 'test@example.com',
          },
        }),
      });
    });

    // Mock servers API response
    await page.route('**/api/servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Fill and submit login form
    await page.getByLabel(/username/i).fill('testuser');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');

    // Should not show login form anymore
    await expect(page.getByText('Server Monitor Dashboard')).not.toBeVisible();
  });

  test('should handle login failure', async ({ page }) => {
    // Mock failed login API response
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: 'Invalid credentials',
        }),
      });
    });

    // Fill and submit login form
    await page.getByLabel(/username/i).fill('wronguser');
    await page.getByLabel(/password/i).fill('wrongpass');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should show error message
    await expect(page.getByText(/invalid credentials/i)).toBeVisible();

    // Should remain on login page
    await expect(page.getByText('Server Monitor Dashboard')).toBeVisible();
  });

  test('should handle logout', async ({ page }) => {
    // First login
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'test-token',
          token_type: 'bearer',
          expires_in: 3600,
          user: {
            id: '1',
            username: 'testuser',
            email: 'test@example.com',
          },
        }),
      });
    });

    await page.route('**/api/servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.getByLabel(/username/i).fill('testuser');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for dashboard to load
    await expect(page).toHaveURL('/dashboard');

    // Click logout (assuming it's in a user menu or header)
    await page.getByRole('button', { name: /logout/i }).click();

    // Should redirect back to login
    await expect(page).toHaveURL('/');
    await expect(page.getByText('Server Monitor Dashboard')).toBeVisible();
  });
});
