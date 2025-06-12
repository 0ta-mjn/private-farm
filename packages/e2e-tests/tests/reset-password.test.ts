import { test, expect } from "@playwright/test";
import { setupUser, getLatestInbucketLink, typeString } from "./util";

test.describe("Reset Password Test", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the base URL before each test
    await page.goto("/");
  });

  test("navigate to reset password page from login", async ({ page }) => {
    // Navigate to login page first
    await page.goto("/login");

    // Click on the "forgot password" link
    await page.click('a[href="/reset-password"]');

    // Check if the URL is correct
    await expect(page).toHaveURL(/.*reset-password/);

    // Check if the page contains the correct heading
    await expect(page.locator('[data-slot="card-title"]')).toHaveText(
      "パスワードリセット"
    );
  });

  test("complete password reset flow via email link", async ({ page }) => {
    // First create a user
    const { testEmail } = await setupUser(page);

    // Navigate to reset password page and send reset email
    await page.goto("/reset-password");
    await typeString(page, 'input[name="email"]', testEmail);
    await page.click('button[type="submit"]');

    // Wait for success message
    await expect(
      page.locator('[data-slot="card-title"]:has-text("メールを送信しました")')
    ).toBeVisible({ timeout: 10000 });

    // Get the reset link from email
    const resetLink = await getLatestInbucketLink(testEmail);
    expect(resetLink).toMatch(/\/auth\/reset-password/);

    // Navigate to the reset link
    await page.goto(resetLink);

    // Should see the new password form
    await expect(
      page.locator(
        '[data-slot="card-title"]:has-text("新しいパスワードを設定")'
      )
    ).toBeVisible({ timeout: 10000 });

    // Fill new password form
    const newPassword = "NewTest123456";
    await typeString(page, 'input[name="password"]', newPassword);
    await typeString(page, 'input[name="confirmPassword"]', newPassword);

    // Submit the form
    await page.click('button[type="submit"]');

    // Should be able to login with new password
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    await typeString(page, 'input[name="email"]', testEmail);
    await typeString(page, 'input[name="password"]', newPassword);
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test("show validation errors for empty email field", async ({ page }) => {
    // Navigate to reset password page
    await page.goto("/reset-password");

    // Try to submit with empty field
    await page.click('button[type="submit"]');

    // Wait for validation to trigger
    await page.waitForTimeout(1000);

    // Check for validation error message
    await expect(
      page.locator(
        '[data-slot="form-message"]:has-text("メールアドレスを入力してください")'
      )
    ).toBeVisible();
  });

  test("navigate back to login from reset password page", async ({ page }) => {
    // Navigate to reset password page
    await page.goto("/reset-password");

    // Click on the "back to login" link
    await page.click('a[href="/login"]');

    // Should navigate to login page
    await expect(page).toHaveURL(/\/login/);
  });

  test("navigate back to login from success page", async ({ page }) => {
    // First create a user
    const { testEmail } = await setupUser(page);

    // Navigate to reset password page
    await page.goto("/reset-password");

    // Fill and submit form
    await typeString(page, 'input[name="email"]', testEmail);
    await page.click('button[type="submit"]');

    // Wait for success message
    await expect(
      page.locator('[data-slot="card-title"]:has-text("メールを送信しました")')
    ).toBeVisible({ timeout: 10000 });

    // Click the "back to login" link
    await page.click('a[href="/login"]');

    // Should navigate to login page
    await expect(page).toHaveURL(/\/login/);
  });

  test("show validation errors for password reset form", async ({ page }) => {
    // First create a user and get reset link
    const { testEmail } = await setupUser(page);

    await page.goto("/reset-password");
    await typeString(page, 'input[name="email"]', testEmail);
    await page.click('button[type="submit"]');

    await expect(
      page.locator('[data-slot="card-title"]:has-text("メールを送信しました")')
    ).toBeVisible({ timeout: 10000 });

    const resetLink = await getLatestInbucketLink(testEmail);
    await page.goto(resetLink);

    await expect(
      page.locator(
        '[data-slot="card-title"]:has-text("新しいパスワードを設定")'
      )
    ).toBeVisible({ timeout: 10000 });

    // Try to submit with empty fields
    await page.click('button[type="submit"]');

    // Wait for validation to trigger
    await page.waitForTimeout(1000);

    // Check for validation error messages
    await expect(
      page.locator(
        '[data-slot="form-message"]:has-text("パスワードは8文字以上で入力してください")'
      )
    ).toBeVisible();
    await expect(
      page.locator(
        '[data-slot="form-message"]:has-text("パスワード確認を入力してください")'
      )
    ).toBeVisible();
  });
});
