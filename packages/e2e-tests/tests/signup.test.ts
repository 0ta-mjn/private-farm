import { test, expect } from "@playwright/test";
import { getLatestInbucketLink, typeString } from "./util";

test.describe("Sign Up Test", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the base URL before each test
    await page.goto("/");
  });

  test("go to the sign up page", async ({ page }) => {
    // Click on the "Sign Up" link
    await page.click('a[href="/signup"]');

    // Check if the URL is correct
    await expect(page).toHaveURL(/.*signup/);

    // Check if the page contains the correct heading (CardTitle renders as div, not h1)
    await expect(page.locator('[data-slot="card-title"]')).toHaveText(
      "アカウント作成"
    );
  });

  test("fill out the sign up form", async ({ page }) => {
    // Navigate to signup page
    await page.goto("/signup");

    // Test data
    const testEmail = `test+${Date.now()}@example.com`;
    const testPassword = "Test123456";

    // Fill out the form
    await typeString(page, 'input[name="email"]', testEmail);
    await typeString(page, 'input[name="password"]', testPassword);
    await typeString(page, 'input[name="confirmPassword"]', testPassword);

    // Check the agreement checkboxes using role and label
    await page
      .getByRole("checkbox", { name: /利用規約.*に同意します/ })
      .check();
    await page
      .getByRole("checkbox", { name: /プライバシーポリシー.*に同意します/ })
      .check();

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for the success message
    await expect(
      page.locator(
        '[data-slot="card-title"]:has-text("確認メールを送信しました")'
      )
    ).toBeVisible({ timeout: 10000 });

    // Verify the email address is displayed in the success message
    await expect(page.locator(`text=${testEmail}`)).toBeVisible();

    // Check if the confirmation link was sent
    const link = await getLatestInbucketLink(testEmail);
    expect(link).toMatch(/\/auth\/confirm($|\/)/);

    // click the confirmation link
    await page.goto(link);
    await expect(page).toHaveURL(/\/setup/, {
      timeout: 10000,
    });
  });

  test("show validation errors for invalid inputs", async ({ page }) => {
    // Navigate to signup page
    await page.goto("/signup");

    // Try to submit with empty fields
    await page.click('button[type="submit"]');

    // Wait a moment for validation to trigger
    await page.waitForTimeout(1000);

    // Check for validation error messages (they should appear after form submission)
    await expect(
      page.locator("text=メールアドレスを入力してください")
    ).toBeVisible();
    await expect(
      page.locator("text=パスワードは8文字以上で入力してください")
    ).toBeVisible();
    await expect(
      page.locator("text=パスワード確認を入力してください")
    ).toBeVisible();
    await expect(page.locator("text=利用規約に同意してください")).toBeVisible();
    await expect(
      page.locator("text=プライバシーポリシーに同意してください")
    ).toBeVisible();
  });

  test("show error for weak password", async ({ page }) => {
    // Navigate to signup page
    await page.goto("/signup");

    // Fill weak password and submit to trigger validation
    await typeString(page, 'input[name="password"]', "weak");
    await page.click('button[type="submit"]');

    // Wait for validation to process
    await page.waitForTimeout(1000);

    // Check for password validation error
    await expect(
      page.locator("text=パスワードは8文字以上で入力してください")
    ).toBeVisible();
  });

  test("show error for password confirmation mismatch", async ({ page }) => {
    // Navigate to signup page
    await page.goto("/signup");

    // Fill different passwords and submit to trigger validation
    await typeString(page, 'input[name="password"]', "Test123456");
    await typeString(page, 'input[name="confirmPassword"]', "Different123");
    await page.click('button[type="submit"]');

    // Wait for validation to process
    await page.waitForTimeout(1000);

    // Check for password mismatch error
    await expect(page.locator("text=パスワードが一致しません")).toBeVisible();
  });

  test("toggle password visibility", async ({ page }) => {
    // Navigate to signup page
    await page.goto("/signup");

    // Fill password
    await typeString(page, 'input[name="password"]', "Test123456");

    // Check initial password input type is "password"
    await expect(page.locator('input[name="password"]')).toHaveAttribute(
      "type",
      "password"
    );

    // Click password visibility toggle button (button next to password input)
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

  test("show loading state during form submission", async ({ page }) => {
    // Navigate to signup page
    await page.goto("/signup");

    // Fill valid form data
    const testEmail = `test+${Date.now()}@example.com`;
    const testPassword = "Test123456";

    await typeString(page, 'input[name="email"]', testEmail);
    await typeString(page, 'input[name="password"]', testPassword);
    await typeString(page, 'input[name="confirmPassword"]', testPassword);
    await page
      .getByRole("checkbox", { name: /利用規約.*に同意します/ })
      .check();
    await page
      .getByRole("checkbox", { name: /プライバシーポリシー.*に同意します/ })
      .check();

    // Submit the form
    await page.click('button[type="submit"]');

    // Check loading state (button should show "作成中..." and be disabled)
    await expect(page.locator('button[type="submit"]:disabled')).toBeVisible();
    await expect(page.locator("text=作成中...")).toBeVisible();
  });

  test("allow user to try different email after success", async ({ page }) => {
    // Navigate to signup page
    await page.goto("/signup");

    // Fill and submit form
    const testEmail = `test+${Date.now()}@example.com`;
    const testPassword = "Test123456";

    await typeString(page, 'input[name="email"]', testEmail);
    await typeString(page, 'input[name="password"]', testPassword);
    await typeString(page, 'input[name="confirmPassword"]', testPassword);
    await page
      .getByRole("checkbox", { name: /利用規約.*に同意します/ })
      .check();
    await page
      .getByRole("checkbox", { name: /プライバシーポリシー.*に同意します/ })
      .check();
    await page.click('button[type="submit"]');

    // Wait for success message
    await expect(
      page.locator(
        '[data-slot="card-title"]:has-text("確認メールを送信しました")'
      )
    ).toBeVisible({ timeout: 10000 });

    // Click the "try different email" button
    await page.click("text=別のメールアドレスで登録する");

    // Should be back to the signup form
    await expect(
      page.locator('[data-slot="card-title"]:has-text("アカウント作成")')
    ).toBeVisible();
    await expect(page.locator('input[name="email"]')).toHaveValue("");
  });
});
