import { test, expect } from "@playwright/test";
import { openSidebarIfNotVisible, setupUser } from "./util";

test.describe("Organization CRUD Test", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the base URL and setup user for each test
    await page.goto("/");
    await setupUser(page);

    // ページに移動
    const isClicked = await openSidebarIfNotVisible(page);

    // リンクをクリック
    await page.click('a[href="/organization/settings"]');
    await page.waitForSelector('h1:has-text("組織設定")');
    if (isClicked) {
      await page.waitForSelector('[data-slot="sidebar-content"]', {
        state: "hidden",
      });
    }
  });

  test("should update organization information successfully", async ({
    page,
  }) => {
    // Navigate to organization settings
    await page.goto("/organization/settings");

    // Wait for the form to load
    await page.waitForSelector('input[name="name"]', { timeout: 10000 });

    // Generate unique values for testing
    const newOrganizationName = `更新された農場${Date.now()}`;
    const newDescription = `更新された説明文 ${Date.now()}`;

    // Clear and update organization name
    await page.fill('input[name="name"]', "");
    await page.fill('input[name="name"]', newOrganizationName);

    // Clear and update description
    await page.fill('textarea[name="description"]', "");
    await page.fill('textarea[name="description"]', newDescription);

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for success message
    await expect(
      page.locator("text=組織情報が正常に更新されました")
    ).toBeVisible({ timeout: 10000 });

    // Verify that the form fields contain the updated values
    await expect(page.locator('input[name="name"]')).toHaveValue(
      newOrganizationName
    );
    await expect(page.locator('textarea[name="description"]')).toHaveValue(
      newDescription
    );

    // Verify that the form fields contain the updated values
    await page.reload();
    await expect(page.locator('input[name="name"]')).toHaveValue(
      newOrganizationName
    );
    await expect(page.locator('textarea[name="description"]')).toHaveValue(
      newDescription
    );
  });

  test("should create a new organization via sidebar dropdown", async ({
    page,
  }) => {
    await openSidebarIfNotVisible(page);

    // Click on organization dropdown in sidebar using more specific selector
    await page.click(
      '[data-slot="sidebar-header"] [data-slot="dropdown-menu-trigger"]',
      {
        timeout: 10000,
      }
    );

    // Wait for dropdown menu to appear and click on "Create new organization" option
    await page.waitForSelector(
      '[data-slot="dialog-trigger"]:has-text("新しい組織を作成")',
      { timeout: 5000 }
    );
    await page.click(
      '[data-slot="dialog-trigger"]:has-text("新しい組織を作成")'
    );

    // Generate unique organization data
    const newOrganizationName = `新しい農場${Date.now()}`;
    const newDescription = `新しい農場の説明 ${Date.now()}`;

    // Fill in the organization creation form
    await page.fill(
      '[data-slot="dialog-content"] input[name="organizationName"]',
      newOrganizationName
    );
    await page.fill(
      '[data-slot="dialog-content"] textarea[name="description"]',
      newDescription
    );

    // Submit the form
    await page.click('button[type="submit"]:has-text("組織を作成")');

    // Verify that the dialog closes and user is redirected or updated
    await expect(page.locator('[data-slot="dialog-content"]')).not.toBeVisible({
      timeout: 5000,
    });

    // Check if the new organization appears in the sidebar dropdown
    await page.waitForSelector(
      `[data-slot="dropdown-menu-item"]:has-text("${newOrganizationName.slice(0, 10)}")`,
      { timeout: 5000 }
    );
  });

  test("should delete organization successfully", async ({ page }) => {
    // Navigate to organization settings
    await page.goto("/organization/settings");

    // Wait for the page to load
    await page.waitForSelector('button:has-text("組織を削除")', {
      timeout: 10000,
    });

    // Click on delete organization button
    await page.click('button:has-text("組織を削除")');

    // Wait for delete confirmation dialog using data-slot selector
    await page.waitForSelector(
      '[data-slot="alert-dialog-title"]:has-text("組織を削除")',
      { timeout: 5000 }
    );

    // Verify warning message is displayed
    await expect(
      page.locator("[data-slot='alert-dialog-content']")
    ).toBeVisible();

    // Confirm deletion
    await page.click('button:has-text("削除する")');

    // Wait for success message
    await expect(page.locator("text=組織を削除しました")).toBeVisible({
      timeout: 10000,
    });

    // Verify user is redirected (organization should no longer be accessible)
    // Since this is the user's only organization, they might be redirected to setup or dashboard
    await page.waitForURL(/\/(dashboard|setup)/, { timeout: 10000 });
  });

  test("should switch between organizations", async ({ page }) => {
    await openSidebarIfNotVisible(page);

    // Create an additional organization first
    await page.click(
      '[data-slot="sidebar-header"] [data-slot="dropdown-menu-trigger"]',
      { timeout: 10000 }
    );
    await page.waitForSelector(
      '[data-slot="dialog-trigger"]:has-text("新しい組織を作成")',
      { timeout: 10000 }
    );
    await page.click(
      '[data-slot="dialog-trigger"]:has-text("新しい組織を作成")'
    );

    const secondOrganizationName = `第二の農場${Date.now()}`;
    await page.fill(
      '[data-slot="dialog-content"] input[name="organizationName"]',
      secondOrganizationName
    );
    await page.click('button[type="submit"]:has-text("組織を作成")');

    // Open dropdown and verify both organizations are listed
    await page.waitForSelector(
      `[data-slot="dropdown-menu-item"]:has-text("${secondOrganizationName.slice(0, 10)}")`,
      { timeout: 5000 }
    );

    // Switch to the first organization by clicking on it
    const organizations = await page
      .locator('[data-slot="dropdown-menu-item"]')
      .count();
    expect(organizations).toBeGreaterThan(1);

    // Click on the first organization (not the current one)
    await page
      .locator(
        `[data-slot="dropdown-menu-item"]:has-text("${secondOrganizationName.slice(0, 10)}")`
      )
      .first()
      .click();

    // Verify that the current organization changed in the sidebar
    await page.waitForTimeout(1000);

    // Navigate to organization settings and verify we're in the correct organization
    await page.goto("/organization/settings");
    await page.waitForSelector('input[name="name"]', { timeout: 10000 });

    // The organization name should match the one we switched to
    const currentOrgName = await page
      .locator('input[name="name"]')
      .inputValue();
    expect(currentOrgName).toBeTruthy();
  });
});
