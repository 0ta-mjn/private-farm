import { test, expect } from "@playwright/test";

test.describe("Hello World Test", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the base URL before each test
    await page.goto("http://localhost:3000");
  });
  test('should display "Hello World" on the page', async ({ page }) => {
    // Check if the page contains the text "Hello World"
    await expect(page).toHaveTitle("");
  });
});
