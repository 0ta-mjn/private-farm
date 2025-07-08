import { test, expect } from "@playwright/test";
import { openSidebarIfNotVisible, setupUser, typeString } from "./util";

test.describe("Account Setting Test", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the base URL and setup user for each test
    await page.goto("/");
  });

  test("should update user profile successfully", async ({ page }) => {
    await setupUser(page);

    await openSidebarIfNotVisible(page);

    // Click on account settings in the sidebar
    await page.waitForSelector(
      '[data-testid="sidebar-account-settings-button"]',
      { timeout: 5000 }
    );
    await page.click('[data-testid="sidebar-account-settings-button"]');

    // Click on profile tab
    await page.click('[data-slot="tabs-trigger"]:has-text("プロフィール")', {
      timeout: 5000,
    });

    // Input new name
    const newName = `テストユーザー${Date.now()}`;
    await page.fill('input[name="name"]', newName);
    await page.click('button[type="submit"]:has-text("更新")');

    await page.waitForSelector(
      `[data-testid="sidebar-account-settings-button"]:has-text("${newName}")`,
      { timeout: 5000 }
    );
  });

  test("should delete user account successfully", async ({ page }) => {
    const { testEmail, testPassword } = await setupUser(page);

    await openSidebarIfNotVisible(page);

    // Click on account settings in the sidebar
    await page.waitForSelector(
      '[data-testid="sidebar-account-settings-button"]',
      { timeout: 5000 }
    );
    await page.click('[data-testid="sidebar-account-settings-button"]');

    // Click on account settings tab
    await page.click('[data-slot="tabs-trigger"]:has-text("ログイン")', {
      timeout: 5000,
    });

    // Click delete account button
    await page.click('button:has-text("アカウントを削除")');

    // Confirm deletion
    await page.click('[data-slot="alert-dialog-action"]:has-text("削除")');

    // Check if the user is redirected to the top page
    await expect(page).toHaveURL("/login");

    // Cannot login with deleted account
    await typeString(page, 'input[name="email"]', testEmail);
    await typeString(page, 'input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/login");
    await expect(page.locator('[data-slot="alert"]')).toBeVisible({
      timeout: 5000,
    });
  });
});
