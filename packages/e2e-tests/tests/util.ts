import { Page, request } from "@playwright/test";

export const typeString = async (
  page: Page,
  selector: string,
  text: string,
  delay = 100
) => {
  const element = page.locator(selector);
  await element.click();
  await page.keyboard.type(text, { delay });
};

export const getLatestInbucketLink = async (email: string) => {
  const inboxUrl = process.env.SUPABASE_INBUCKET_URL;
  if (!inboxUrl) {
    throw new Error("SUPABASE_INBUCKET_URL environment variables must be set");
  }

  const api = await request.newContext();
  const inbox = await api.get(`${inboxUrl}/api/v1/search?query=${email}`).then(
    (r) =>
      r.json() as unknown as {
        messages: { Created: string; ID: string }[];
      }
  );
  const latest = inbox.messages.sort(
    (a, b) => new Date(b.Created).getTime() - new Date(a.Created).getTime()
  )[0]!;
  const msg = await api
    .get(`${inboxUrl}/api/v1/message/${latest.ID}`)
    .then((r) => r.json() as unknown as { Text: string });
  return msg.Text.match(/https?:\/\/[^\s"]+/)![0];
};

export const signupWithEmail = async (page: Page, confirm = true) => {
  const testEmail = `test+${Date.now()}@example.com`;
  const testPassword = "Test123456";

  // Navigate to signup page
  await page.goto("/signup");

  // Fill out the form
  await typeString(page, 'input[name="email"]', testEmail);
  await typeString(page, 'input[name="password"]', testPassword);
  await typeString(page, 'input[name="confirmPassword"]', testPassword);

  // Check the agreement checkboxes using role and label
  await page.getByRole("checkbox", { name: /利用規約.*に同意します/ }).check();
  await page
    .getByRole("checkbox", { name: /プライバシーポリシー.*に同意します/ })
    .check();

  // Submit the form
  await page.click('button[type="submit"]');
  await page.waitForSelector(
    '[data-slot="card-title"]:has-text("確認メールを送信しました")',
    { timeout: 10000 }
  );

  // Check if the confirmation link was sent
  const link = await getLatestInbucketLink(testEmail);
  if (confirm) {
    await page.goto(link);
    await page.waitForURL(/setup/, { timeout: 10000 });
  }

  return { testEmail, testPassword, link };
};

export const setupUser = async (page: Page) => {
  const { testEmail, testPassword } = await signupWithEmail(page, true);

  // Complete setup form
  await page.waitForURL(/setup/, { timeout: 10000 });
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
  await page.waitForURL(/dashboard/, { timeout: 10000 });
  await page.waitForSelector("h1", {
    timeout: 10000,
  });
  await page.waitForSelector('[data-testid="sidebar-skeleton"]', {
    timeout: 10000,
    state: "hidden",
  });

  return { testEmail, testPassword };
};

export const openSidebarIfNotVisible = async (page: Page) => {
  const diaryLink = page.locator('[data-slot="sidebar-content"]');
  const isLinkVisible = await diaryLink.isVisible();

  if (!isLinkVisible) {
    // モバイルの場合はサイドバーを開く
    await page.click('[data-slot="sidebar-trigger"]', {
      timeout: 5000,
    });
  }

  // サイドバーが開くまで待機
  await page.waitForSelector('[data-slot="sidebar-content"]', {
    state: "visible",
  });

  return !isLinkVisible;
};
