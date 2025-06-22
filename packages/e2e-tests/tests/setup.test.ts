import { test, expect } from "@playwright/test";
import { signupWithEmail, typeString } from "./util";

test.describe("Setup Test", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the base URL before each test
    await page.goto("/");
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

  test("show validation errors for empty fields", async ({ page }) => {
    // Complete signup and email verification
    await signupWithEmail(page, true);

    // Should be redirected to setup page
    await expect(page).toHaveURL(/\/setup/);

    // Try to submit with empty fields
    await page.click('button[type="submit"]');

    // Check for validation error messages using data-slot selector
    await expect(
      page.locator(
        '[data-slot="form-message"]:has-text("ユーザー名は2文字以上で入力してください")'
      )
    ).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.locator(
        '[data-slot="form-message"]:has-text("組織名を入力してください")'
      )
    ).toBeVisible({
      timeout: 10000,
    });
  });

  test("show loading state during form submission", async ({ page }) => {
    // Complete signup and email verification
    await signupWithEmail(page, true);

    // Should be redirected to setup page
    await expect(page).toHaveURL(/\/setup/);

    // Fill valid form data
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

    // Check loading state (button should show "設定中..." and be disabled)
    await expect(page.locator('button[type="submit"]:disabled')).toBeVisible();
    await expect(page.locator("text=設定中...")).toBeVisible();
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
