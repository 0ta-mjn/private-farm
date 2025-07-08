import { test, expect } from "@playwright/test";
import { setupUser, getLatestInbucketLink, typeString } from "./util";

test.describe("Reset Password Test", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the base URL before each test
    await page.goto("/");
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
});
