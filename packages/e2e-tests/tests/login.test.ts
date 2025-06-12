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

  test("show validation errors for empty fields", async ({ page }) => {
    // Navigate to login page
    await page.goto("/login");

    // Try to submit with empty fields
    await page.click('button[type="submit"]');

    // Wait for validation to trigger
    await page.waitForTimeout(1000);

    // Check for validation error messages
    await expect(
      page.locator(
        '[data-slot="form-message"]:has-text("メールアドレスを入力してください")'
      )
    ).toBeVisible();
    await expect(
      page.locator(
        '[data-slot="form-message"]:has-text("パスワードを入力してください")'
      )
    ).toBeVisible();
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

  test("toggle password visibility", async ({ page }) => {
    // Navigate to login page
    await page.goto("/login");

    // Fill password
    await typeString(page, 'input[name="password"]', "Test123456");

    // Check initial password input type is "password"
    await expect(page.locator('input[name="password"]')).toHaveAttribute(
      "type",
      "password"
    );

    // Click password visibility toggle button
    await page.click('input[name="password"] ~ button');

    // Check password input type changed to "text"
    await expect(page.locator('input[name="password"]')).toHaveAttribute(
      "type",
      "text"
    );

    // Click again to hide password
    await page.click('input[name="password"] ~ button');

    // Check password input type changed back to "password"
    await expect(page.locator('input[name="password"]')).toHaveAttribute(
      "type",
      "password"
    );
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

  test("retain form values after validation error", async ({ page }) => {
    // Navigate to login page
    await page.goto("/login");

    // Fill invalid email and valid password
    const testEmail = "invalid-email";
    const testPassword = "Test123456";

    await typeString(page, 'input[name="email"]', testEmail);
    await typeString(page, 'input[name="password"]', testPassword);

    // Submit to trigger validation
    await page.click('button[type="submit"]');

    // Wait for validation
    await page.waitForTimeout(1000);

    // Check that form values are retained
    await expect(page.locator('input[name="email"]')).toHaveValue(testEmail);
    await expect(page.locator('input[name="password"]')).toHaveValue(
      testPassword
    );
  });
});
