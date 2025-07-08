import { test, expect } from "@playwright/test";
import { signupWithEmail, setupUser, typeString } from "./util";

test.describe("Login Test", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the base URL before each test
    await page.goto("/");
  });

  test("successful login with valid credentials", async ({ page }) => {
    // First create a user with completed setup
    const { testEmail, testPassword } = await setupUser(page);

    // Navigate to login page
    await page.goto("/login");

    // Fill login form with valid credentials
    await typeString(page, 'input[name="email"]', testEmail);
    await typeString(page, 'input[name="password"]', testPassword);

    // Submit the form
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test("login with unverified user redirects to setup", async ({ page }) => {
    // Create a user with email confirmed but setup not completed
    const { testEmail, testPassword } = await signupWithEmail(page, true);

    // Should be redirected to setup page, navigate to login instead
    await page.goto("/login");

    // Fill login form with valid credentials
    await typeString(page, 'input[name="email"]', testEmail);
    await typeString(page, 'input[name="password"]', testPassword);

    // Submit the form
    await page.click('button[type="submit"]');

    // Should redirect to setup page
    await expect(page).toHaveURL(/\/setup/, { timeout: 10000 });
  });

  test("show error for invalid credentials", async ({ page }) => {
    // Navigate to login page
    await page.goto("/login");

    // Fill with invalid credentials
    await typeString(page, 'input[name="email"]', "nonexistent@example.com");
    await typeString(page, 'input[name="password"]', "wrongpassword");

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for error response
    await page.waitForTimeout(2000);

    // Check for invalid credentials error
    await expect(
      page.locator("text=メールアドレスまたはパスワードが正しくありません。")
    ).toBeVisible();
  });

  test("navigate to password reset page", async ({ page }) => {
    // Navigate to login page
    await page.goto("/login");

    // Click on the "forgot password" link
    await page.click('a[href="/reset-password"]');

    // Should navigate to reset password page
    await expect(page).toHaveURL(/\/reset-password/);
  });

  test("navigate to signup page", async ({ page }) => {
    // Navigate to login page
    await page.goto("/login");

    // Click on the "signup" link
    await page.click('a[href="/signup"]');

    // Should navigate to signup page
    await expect(page).toHaveURL(/\/signup/);
  });
});
