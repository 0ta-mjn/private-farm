import { test, expect } from "@playwright/test";
import { getLatestInbucketLink, signupWithEmail, typeString } from "./util";

test.describe("Sign Up Test", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the base URL before each test
    await page.goto("/");
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

  test("complete initial setup form", async ({ page }) => {
    // Complete signup and email verification
    await signupWithEmail(page, true);

    // Should be redirected to setup page
    await expect(page).toHaveURL(/\/setup/);

    // Check if the page contains the correct heading
    await expect(page.locator('[data-slot="card-title"]')).toHaveText(
      "初期設定"
    );

    // Fill out the setup form
    const testUserName = `テストユーザー${Date.now()}`;
    const testOrganizationName = `テスト農場${Date.now()}`;

    await typeString(page, 'input[name="userName"]', testUserName);
    await typeString(
      page,
      'input[name="organizationName"]',
      testOrganizationName
    );

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test("redirect to dashboard if setup is already completed", async ({
    page,
  }) => {
    // Complete signup, email verification, and setup
    await signupWithEmail(page, true);

    // Complete setup form
    await expect(page).toHaveURL(/\/setup/);
    const testUserName = `テストユーザー${Date.now()}`;
    const testOrganizationName = `テスト農場${Date.now()}`;

    await typeString(page, 'input[name="userName"]', testUserName);
    await typeString(
      page,
      'input[name="organizationName"]',
      testOrganizationName
    );
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Now try to access setup page again - should redirect to dashboard
    await page.goto("/setup");
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
