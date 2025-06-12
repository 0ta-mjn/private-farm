import { test, expect } from "@playwright/test";
import { setupUser, getLatestInbucketLink } from "./util";

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

  test("send password reset email successfully", async ({ page }) => {
    // First create a user with completed setup
    const { testEmail } = await setupUser(page);

    // Navigate to reset password page
    await page.goto("/reset-password");

    // Fill email field
    await page.fill('input[name="email"]', testEmail);

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for success message
    await expect(
      page.locator('[data-slot="card-title"]:has-text("メールを送信しました")')
    ).toBeVisible({ timeout: 10000 });

    // Check if the email address is displayed
    await expect(page.locator(`text=${testEmail}`)).toBeVisible();
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

  test("allow user to try different email after success", async ({ page }) => {
    // First create a user
    const { testEmail } = await setupUser(page);

    // Navigate to reset password page
    await page.goto("/reset-password");

    // Fill and submit form
    await page.fill('input[name="email"]', testEmail);
    await page.click('button[type="submit"]');

    // Wait for success message
    await expect(
      page.locator('[data-slot="card-title"]:has-text("メールを送信しました")')
    ).toBeVisible({ timeout: 10000 });

    // Click the "try different email" button
    await page.click("text=別のメールアドレスで再送信");

    // Should be back to the reset password form
    await expect(
      page.locator('[data-slot="card-title"]:has-text("パスワードリセット")')
    ).toBeVisible();
    await expect(page.locator('input[name="email"]')).toHaveValue("");
  });

  test("navigate back to login from success page", async ({ page }) => {
    // First create a user
    const { testEmail } = await setupUser(page);

    // Navigate to reset password page
    await page.goto("/reset-password");

    // Fill and submit form
    await page.fill('input[name="email"]', testEmail);
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

  test("display proper form placeholder and description", async ({ page }) => {
    // Navigate to reset password page
    await page.goto("/reset-password");

    // Check form field placeholder
    await expect(page.locator('input[name="email"]')).toHaveAttribute(
      "placeholder",
      "your@email.com"
    );

    // Check description text
    await expect(
      page.locator("text=登録済みのメールアドレスを入力してください。")
    ).toBeVisible();
    await expect(
      page.locator("text=パスワードリセット用のリンクをお送りします。")
    ).toBeVisible();
  });

  test("display success page information correctly", async ({ page }) => {
    // First create a user
    const { testEmail } = await setupUser(page);

    // Navigate to reset password page
    await page.goto("/reset-password");

    // Fill and submit form
    await page.fill('input[name="email"]', testEmail);
    await page.click('button[type="submit"]');

    // Wait for success message
    await expect(
      page.locator('[data-slot="card-title"]:has-text("メールを送信しました")')
    ).toBeVisible({ timeout: 10000 });

    // Check success page information
    await expect(
      page.locator("text=パスワードリセットの手順をメールでお送りしました。")
    ).toBeVisible();
    await expect(
      page.locator(
        "text=メールが届かない場合は、迷惑メールフォルダをご確認ください"
      )
    ).toBeVisible();
    await expect(page.locator("text=リンクは24時間有効です")).toBeVisible();
  });

  test("complete password reset flow via email link", async ({ page }) => {
    // First create a user
    const { testEmail } = await setupUser(page);

    // Navigate to reset password page and send reset email
    await page.goto("/reset-password");
    await page.fill('input[name="email"]', testEmail);
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
    await page.fill('input[name="password"]', newPassword);
    await page.fill('input[name="confirmPassword"]', newPassword);

    // Submit the form
    await page.click('button[type="submit"]');

    // Should be able to login with new password
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', newPassword);
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test("show validation errors for password reset form", async ({ page }) => {
    // First create a user and get reset link
    const { testEmail } = await setupUser(page);

    await page.goto("/reset-password");
    await page.fill('input[name="email"]', testEmail);
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

  test("show error for password mismatch in reset form", async ({ page }) => {
    // First create a user and get reset link
    const { testEmail } = await setupUser(page);

    await page.goto("/reset-password");
    await page.fill('input[name="email"]', testEmail);
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

    // Fill different passwords
    await page.fill('input[name="password"]', "NewTest123456");
    await page.fill('input[name="confirmPassword"]', "Different123");
    await page.click('button[type="submit"]');

    // Wait for validation to process
    await page.waitForTimeout(1000);

    // Check for password mismatch error
    await expect(
      page.locator(
        '[data-slot="form-message"]:has-text("パスワードが一致しません")'
      )
    ).toBeVisible();
  });

  test("toggle password visibility in reset form", async ({ page }) => {
    // First create a user and get reset link
    const { testEmail } = await setupUser(page);

    await page.goto("/reset-password");
    await page.fill('input[name="email"]', testEmail);
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

    // Fill password
    await page.fill('input[name="password"]', "Test123456");

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
});
