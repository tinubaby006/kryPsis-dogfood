import { test, expect } from '@playwright/test';

// Real PostgreSQL and HTTP integration tests for Section 7 Matrix
test.describe('E2E Workflow & Security Matrix', () => {

  test('Public Gallery is accessible without auth', async ({ page }) => {
    await page.goto('/events/evt_01');
    await expect(page.getByRole('heading').first()).toBeVisible();
  });

  test('Auth isolation: Signed-out user cannot access judge dashboard', async ({ page }) => {
    // Attempt to go to judge dashboard
    await page.goto('/events/evt_01/judge');
    
    // In Next.js app router, we are rendering a 401 page without redirecting
    await expect(page.getByText(/401 UNAUTHORIZED/i)).toBeVisible();
  });

  test('Judge UI Workflow: Authentic historical evidence appears', async ({ page }) => {
    // Navigate to login
    await page.goto('/sign-in');
    
    // Assuming a known local test account exists, e.g. tomas.varga@example.org
    // In a real test we'd seed this. We'll use the fixture judge "tomas.varga@example.org"
    await page.fill('input[type="email"]', 'tomas.varga@example.org');
    await page.fill('input[type="password"]', 'dogfood_local_dev');
    
    await page.click('button[type="submit"]');
    await expect(page).not.toHaveURL(/.*sign-in.*/);

    // Check successful login
    await page.goto('/events/evt_01/judge');
    
    // Assert modern fixture records appear in the judge UI
    await expect(page.getByText(/Your Assignments/i)).toBeVisible();
    await expect(page.getByText(/Score:/i).first()).toBeVisible();
    
    // Verify sign out works by waiting for navigation to /sign-in
    await page.click('button:has-text("Sign Out")');
    await expect(page).toHaveURL(/.*sign-in.*/);
    
    // Verify reload after signout is blocked
    await page.goto('/events/evt_01/judge');
    await expect(page.getByText(/401 UNAUTHORIZED/i)).toBeVisible();
  });
});
