/**
 * アプリケーション全体で使用されるカスタムエラークラスの定義
 */

/**
 * ユーザー作成関連のエラー
 */
export class UserCreationError extends Error {
  constructor() {
    super("ユーザーの作成に失敗しました");
    this.name = "UserCreationError";
  }
}

/**
 * 組織作成関連のエラー
 */
export class OrganizationCreationError extends Error {
  constructor() {
    super("組織の作成に失敗しました");
    this.name = "OrganizationCreationError";
  }
}

/**
 * 組織メンバーシップ作成関連のエラー
 */
export class MembershipCreationError extends Error {
  constructor() {
    super("組織メンバーシップの作成に失敗しました");
    this.name = "MembershipCreationError";
  }
}

/**
 * 組織更新関連のエラー
 */
export class OrganizationUpdateError extends Error {
  constructor(message: string = "組織の更新に失敗しました") {
    super(message);
    this.name = "OrganizationUpdateError";
  }
}
