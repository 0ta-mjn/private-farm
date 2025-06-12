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

/**
 * データが見つからない場合のエラー
 */
export class NotFoundError extends Error {
  constructor(message: string = "データが見つかりません") {
    super(message);
    this.name = "NotFoundError";
  }
}

/**
 * アクセス権限がない場合のエラー
 */
export class UnauthorizedError extends Error {
  constructor(message: string = "この操作を実行する権限がありません") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * バリデーションエラー
 */
export class ValidationError extends Error {
  constructor(message: string = "入力データが無効です") {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * ほ場作成関連のエラー
 */
export class ThingCreationError extends Error {
  constructor(message: string = "ほ場の作成に失敗しました") {
    super(message);
    this.name = "ThingCreationError";
  }
}

/**
 * ほ場更新関連のエラー
 */
export class ThingUpdateError extends Error {
  constructor(message: string = "ほ場の更新に失敗しました") {
    super(message);
    this.name = "ThingUpdateError";
  }
}
