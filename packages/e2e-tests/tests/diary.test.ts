import { test, expect } from "@playwright/test";
import { openSidebarIfNotVisible, setupUser } from "./util";
import { format } from "date-fns";

test.describe("Diary CRUD Test", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the base URL and setup user for each test
    await page.goto("/");
    await setupUser(page);

    // ページに移動
    await openSidebarIfNotVisible(page);

    // リンクをクリック
    await page.click('a[href="/diary"]');
    await page.waitForSelector('h1:has-text("農業日誌")');
  });

  test("should create a diary entry", async ({ page }) => {
    // 日誌作成ボタンをクリック
    await page.click('button:has-text("日誌を追加")');

    // フォームが表示されるまで待機
    await page.waitForSelector(
      '[data-slot="drawer-content"], [data-slot="sheet-content"]'
    );

    // 日付を設定（今日の日付） - 日付ピッカーをクリックして今日を選択
    const today = new Date().toLocaleDateString("ja-JP");
    await page.click('[data-testid="date-picker-trigger"]');
    await page.waitForSelector('[data-slot="calendar"]');
    // 今日の日付のボタンをクリック（カレンダーの今日）
    await page
      .locator(`[data-slot="calendar"] [data-day="${today}"]`)
      .first()
      .click();
    await page.click('[data-testid="date-picker-trigger"]');

    // 内容を入力
    await page.fill(
      '[data-testid="content-textarea"]',
      "テスト用の日誌内容です。トマトの水やりを行いました。"
    );

    // 作業種別を選択
    await page.click('[data-testid="work-type-select"]');
    await page.waitForSelector('[data-testid="work-type-options"]');
    await page.click('[data-testid="work-type-option-IRRIGATION"]');

    // 天候を選択
    await page.click('[data-testid="weather-select"]');
    await page.waitForSelector('[data-testid="weather-options"]');
    await page.click('[data-testid="weather-option-CLEAR"]');

    // 保存ボタンをクリック
    await page.click(
      'button[data-testid="submit-button-mobile"], button[data-testid="submit-button-desktop"]'
    );
    await page.waitForTimeout(1000); // 少し待機してから確認

    // ドローワーが表示されなくなるまで待機
    await page.waitForSelector(
      '[data-slot="drawer-content"], [data-slot="sheet-content"]',
      { state: "hidden" }
    );
    await expect(
      page.locator(
        `[data-testid="diary-calendar-diary-badge-${format(
          new Date(),
          "yyyy-MM-dd"
        )}-0"]`
      )
    ).toBeVisible();
  });

  test("should display diary details when clicking on a date", async ({
    page,
  }) => {
    // 日誌作成
    await page.click('button:has-text("日誌を追加")');
    await page.waitForSelector(
      '[data-slot="drawer-content"], [data-slot="sheet-content"]'
    );

    const today = new Date().toLocaleDateString("ja-JP");
    await page.click('[data-testid="date-picker-trigger"]');
    await page.waitForSelector('[data-slot="calendar"]');
    await page
      .locator(`[data-slot="calendar"] [data-day="${today}"]`)
      .first()
      .click();
    await page.click('[data-testid="date-picker-trigger"]');
    await page.fill(
      '[data-testid="content-textarea"]',
      "詳細確認用の内容です。"
    );

    await page.click('[data-testid="work-type-select"]');
    await page.waitForSelector('[data-testid="work-type-options"]');
    await page.click('[data-testid="work-type-option-SEEDING"]');

    await page.click(
      'button[data-testid="submit-button-mobile"], button[data-testid="submit-button-desktop"]'
    );

    await page.waitForSelector(
      '[data-slot="drawer-content"], [data-slot="sheet-content"]',
      { state: "hidden" }
    );

    // カレンダーの該当日をクリック
    await page.click(
      `[data-testid="diary-calendar-day-${format(new Date(), "yyyy-MM-dd")}"]`
    );

    // 日誌詳細が表示されることを確認
    await page.waitForSelector('[data-testid="date-detail"]');
    await expect(page.locator("text=詳細確認用の内容です。")).toBeVisible();
    await expect(
      page.locator('[data-testid="date-detail"] >> text=播種')
    ).toBeVisible();
  });

  test("should edit an existing diary entry", async ({ page }) => {
    await page.click('button:has-text("日誌を追加")');
    await page.waitForSelector(
      '[data-slot="drawer-content"], [data-slot="sheet-content"]'
    );

    const today = new Date().toLocaleDateString("ja-JP");
    await page.click('[data-testid="date-picker-trigger"]');
    await page.waitForSelector('[data-slot="calendar"]');
    await page
      .locator(`[data-slot="calendar"] [data-day="${today}"]`)
      .first()
      .click();
    await page.click('[data-testid="date-picker-trigger"]');

    await page.fill('[data-testid="content-textarea"]', "編集前の内容です。");

    await page.click('[data-testid="work-type-select"]');
    await page.waitForSelector('[data-testid="work-type-options"]');
    await page.click('[data-testid="work-type-option-SEEDING"]');

    await page.click(
      'button[data-testid="submit-button-mobile"], button[data-testid="submit-button-desktop"]'
    );

    await page.waitForSelector(
      '[data-slot="drawer-content"], [data-slot="sheet-content"]',
      { state: "hidden" }
    );

    // カレンダーの該当日をクリックして詳細を表示
    await page.click(
      `[data-testid="diary-calendar-day-${format(new Date(), "yyyy-MM-dd")}"]`
    );
    await page.waitForSelector('[data-testid="date-detail"]');

    // ドロップダウンメニューを開き、編集ボタンをクリック
    await page.click(
      '[data-testid="date-detail"] [data-slot="dropdown-menu-trigger"]'
    );
    await page.click('[data-slot="dropdown-menu-item"]:has-text("編集")');
    await page.waitForSelector(
      '[data-slot="drawer-content"], [data-slot="sheet-content"]'
    );

    // 内容を変更
    await page.fill(
      '[data-testid="content-textarea"]',
      "編集後の内容に変更しました。"
    );

    // 作業種別を変更
    await page.click('[data-testid="work-type-select"]');
    await page.waitForSelector('[data-testid="work-type-options"]');
    await page.click('[data-testid="work-type-option-HARVESTING"]');

    // 保存
    await page.click(
      'button[data-testid="submit-button-mobile"], button[data-testid="submit-button-desktop"]'
    );

    // 変更が反映されることを確認
    await page.waitForSelector('[data-testid="date-detail"]');
    await expect(page.locator("text=編集後の内容に変更しました。")).toBeVisible(
      { timeout: 5000 }
    );
    await expect(
      page.locator('[data-testid="date-detail"] >> text=収穫')
    ).toBeVisible();
  });

  test("should delete a diary entry", async ({ page }) => {
    await page.click('button:has-text("日誌を追加")');
    await page.waitForSelector(
      '[data-slot="drawer-content"], [data-slot="sheet-content"]'
    );

    const today = new Date().toLocaleDateString("ja-JP");
    await page.click('[data-testid="date-picker-trigger"]');
    await page.waitForSelector('[data-slot="calendar"]');
    await page
      .locator(`[data-slot="calendar"] [data-day="${today}"]`)
      .first()
      .click();
    await page.click('[data-testid="date-picker-trigger"]');

    await page.fill(
      '[data-testid="content-textarea"]',
      "削除される予定の日誌です。"
    );

    await page.click('[data-testid="work-type-select"]');
    await page.waitForSelector('[data-testid="work-type-options"]');
    await page.click('[data-testid="work-type-option-WEEDING"]');

    await page.click(
      'button[data-testid="submit-button-mobile"], button[data-testid="submit-button-desktop"]'
    );
    await page.waitForSelector(
      '[data-slot="drawer-content"], [data-slot="sheet-content"]',
      { state: "hidden" }
    );

    // カレンダーの該当日をクリックして詳細を表示
    await page.click(
      `[data-testid="diary-calendar-day-${format(new Date(), "yyyy-MM-dd")}"]`
    );
    await page.waitForSelector('[data-testid="date-detail"]');
    await expect(page.locator("text=削除される予定の日誌です。")).toBeVisible();

    // ドロップダウンメニューを開き、削除ボタンをクリック
    await page.click(
      '[data-testid="date-detail"] [data-slot="dropdown-menu-trigger"]'
    );
    await page.click('[data-slot="dropdown-menu-item"]:has-text("削除")');

    // 削除確認ダイアログが表示されることを確認
    await page.waitForSelector('[data-slot="alert-dialog-content"]');
    await expect(page.locator("text=この日誌を削除しますか？")).toBeVisible();

    // 削除を実行
    await page.click('button:has-text("削除する")');
    await page.waitForSelector('[data-slot="alert-dialog-content"]', {
      state: "hidden",
    });

    // 該当日に日誌が表示されないことを確認
    await expect(page.locator('[data-testid="date-detail"]')).not.toBeVisible({
      timeout: 5000,
    });
  });

  test("should validate required fields when creating a diary entry", async ({
    page,
  }) => {
    // 日誌作成フォームを開く
    await page.click('button:has-text("日誌を追加")');
    await page.waitForSelector(
      '[data-slot="drawer-content"], [data-slot="sheet-content"]'
    );

    // 必須項目を入力せずに保存を試行
    await page.click(
      'button[data-testid="submit-button-mobile"], button[data-testid="submit-button-desktop"]'
    );

    // バリデーションエラーが表示されることを確認
    await expect(page.locator('[data-testid="work-type-error"]')).toBeVisible();
  });

  // 複数日誌、検索機能等のテストは実装が複雑になるため、将来のイテレーションで追加
  /*
  test("should handle multiple diary entries", async ({ page }) => {
    // TODO: 実装予定
  });

  test("should search diary entries", async ({ page }) => {
    // TODO: 実装予定
  });
  */
});
