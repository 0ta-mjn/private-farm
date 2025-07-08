import { test, expect } from "@playwright/test";
import { openSidebarIfNotVisible, setupUser } from "./util";

test.describe("Thing CRUD Test", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the base URL and setup user for each test
    await page.goto("/");
    await setupUser(page);

    // ページに移動
    await openSidebarIfNotVisible(page);
    await page.click('[href="/things"]');
    await page.waitForSelector('h1:has-text("区画・センサー管理")');
  });

  test("should create a new thing", async ({ page }) => {
    // Click on create thing button using data-slot attribute
    await page.click('[data-slot="button"]:has-text("区画を追加")');

    // Wait for the form dialog/drawer to open
    await page.waitForSelector(
      '[data-testid="thing-form-dialog"], [data-testid="thing-form-drawer"]',
      {
        timeout: 10000,
      }
    );

    // Fill out the form
    const testThingName = `テスト区画${Date.now()}`;
    await page.fill('[data-testid="name-input"]', testThingName);

    // Select type
    await page.click('[data-testid="type-select"]');
    await page.click('[data-testid="type-option-FIELD"]');

    // Fill optional fields
    await page.fill('[data-testid="location-input"]', "テスト場所");
    await page.fill('[data-testid="area-input"]', "100");
    await page.fill(
      '[data-testid="description-textarea"]',
      "テスト用の区画です"
    );

    // Submit the form
    await page.click(
      '[data-testid="submit-button-desktop"], [data-testid="submit-button-mobile"]'
    );

    // Wait for success and dialog to close
    await page.waitForTimeout(2000);

    // Verify that the thing appears in the list using a more robust selector
    await expect(page.locator(`h3:has-text("${testThingName}")`)).toBeVisible({
      timeout: 10000,
    });
  });

  test("should edit an existing thing", async ({ page }) => {
    // First create a thing
    await page.goto("/things");
    await page.waitForSelector("h1", { timeout: 10000 });

    // Create a new thing
    await page.click('[data-slot="button"]:has-text("区画を追加")');
    await page.waitForSelector(
      '[data-testid="thing-form-dialog"], [data-testid="thing-form-drawer"]',
      {
        timeout: 10000,
      }
    );

    const originalThingName = `編集前区画${Date.now()}`;
    await page.fill('[data-testid="name-input"]', originalThingName);
    await page.click('[data-testid="type-select"]');
    await page.click('[data-testid="type-option-FIELD"]');
    await page.click(
      '[data-testid="submit-button-desktop"], [data-testid="submit-button-mobile"]'
    );

    // Wait for the thing to be created
    await page.waitForTimeout(2000);
    await expect(
      page.locator(`h3:has-text("${originalThingName}")`)
    ).toBeVisible({
      timeout: 10000,
    });

    // Now edit the thing - find and click the edit button using data-slot
    const thingCard = page.locator('[data-slot="card"], .thing-card').filter({
      hasText: originalThingName,
    });
    await thingCard
      .locator(
        '[data-slot="button"]:has-text("編集"), [data-testid="edit-button"]'
      )
      .click();

    // Wait for the edit form to open
    await page.waitForSelector(
      '[data-testid="thing-form-dialog"], [data-testid="thing-form-drawer"]',
      {
        timeout: 10000,
      }
    );

    // Update the fields
    const updatedThingName = `編集後区画${Date.now()}`;
    await page.fill('[data-testid="name-input"]', "");
    await page.fill('[data-testid="name-input"]', updatedThingName);
    await page.fill('[data-testid="location-input"]', "");
    await page.fill('[data-testid="location-input"]', "更新された場所");

    // Submit the form
    await page.click(
      '[data-testid="submit-button-desktop"], [data-testid="submit-button-mobile"]'
    );

    // Wait for the update to complete
    await page.waitForTimeout(2000);

    // Verify that the thing has been updated
    await expect(
      page.locator(`h3:has-text("${updatedThingName}")`)
    ).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.locator(`h3:has-text("${originalThingName}")`)
    ).not.toBeVisible();
  });

  test("should delete an existing thing", async ({ page }) => {
    // First create a thing
    await page.goto("/things");
    await page.waitForSelector("h1", { timeout: 10000 });

    // Create a new thing
    await page.click('[data-slot="button"]:has-text("区画を追加")');
    await page.waitForSelector(
      '[data-testid="thing-form-dialog"], [data-testid="thing-form-drawer"]',
      {
        timeout: 10000,
      }
    );

    const thingToDelete = `削除予定区画${Date.now()}`;
    await page.fill('[data-testid="name-input"]', thingToDelete);
    await page.click('[data-testid="type-select"]');
    await page.click('[data-testid="type-option-FIELD"]');
    await page.click(
      '[data-testid="submit-button-desktop"], [data-testid="submit-button-mobile"]'
    );

    // Wait for the thing to be created
    await page.waitForTimeout(2000);
    await expect(page.locator(`h3:has-text("${thingToDelete}")`)).toBeVisible({
      timeout: 10000,
    });

    // Find and click the delete button using data-slot
    const thingCard = page.locator('[data-slot="card"], .thing-card').filter({
      hasText: thingToDelete,
    });
    await thingCard
      .locator(
        '[data-slot="button"]:has-text("削除"), [data-testid="delete-button"]'
      )
      .click();

    // Wait for the delete confirmation dialog
    await expect(
      page.locator('[data-slot="alert-dialog-title"]:has-text("区画を削除")')
    ).toBeVisible({
      timeout: 10000,
    });

    // Confirm the deletion
    await page.click('[data-slot="alert-dialog-action"]:has-text("削除する")');

    // Wait for the deletion to complete
    await page.waitForTimeout(2000);

    // Verify that the thing has been deleted
    await expect(
      page.locator(`h3:has-text("${thingToDelete}")`)
    ).not.toBeVisible();
  });

  test("should display thing details correctly", async ({ page }) => {
    // First create a thing with all fields filled
    await page.goto("/things");
    await page.waitForSelector("h1", { timeout: 10000 });

    // Create a new thing
    await page.click('[data-slot="button"]:has-text("区画を追加")');
    await page.waitForSelector(
      '[data-testid="thing-form-dialog"], [data-testid="thing-form-drawer"]',
      {
        timeout: 10000,
      }
    );

    const detailThingName = `詳細表示区画${Date.now()}`;
    const testLocation = "詳細テスト場所";
    const testArea = "500";
    const testDescription = "詳細表示用のテスト区画です";

    await page.fill('[data-testid="name-input"]', detailThingName);
    await page.click('[data-testid="type-select"]');
    await page.click('[data-testid="type-option-HOUSE"]');
    await page.fill('[data-testid="location-input"]', testLocation);
    await page.fill('[data-testid="area-input"]', testArea);
    await page.fill('[data-testid="description-textarea"]', testDescription);
    await page.click(
      '[data-testid="submit-button-desktop"], [data-testid="submit-button-mobile"]'
    );

    // Wait for the thing to be created
    await page.waitForTimeout(2000);

    // Verify that all details are displayed correctly using more specific selectors
    await expect(
      page.locator(`h3:has-text("${detailThingName}")`)
    ).toBeVisible();
    await expect(
      page.locator(`.text-muted-foreground:has-text("${testLocation}")`)
    ).toBeVisible();
    await expect(
      page.locator(`.text-muted-foreground:has-text("${testArea}")`)
    ).toBeVisible();
    await expect(
      page.locator(`p:has-text("${testDescription}")`)
    ).toBeVisible();
  });
});
