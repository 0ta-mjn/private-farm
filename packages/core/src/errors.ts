/**
 * アプリケーション全体で使用されるカスタムエラークラスの定義
 */

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
