import { z } from "zod";
import { eq, withUniqueIdRetry } from "@repo/db";
import {
  usersTable,
  organizationsTable,
  organizationMembersTable,
  MemberRoleSchema,
} from "@repo/db/schema";
import { DEFAULT_UUID_CONFIG } from "@repo/config";
import type { Database } from "@repo/db/client";

// バリデーションスキーマ
export const SetupSchema = z.object({
  userName: z
    .string()
    .min(2, "ユーザー名は2文字以上で入力してください")
    .max(50, "ユーザー名は50文字以下で入力してください"),
  organizationName: z
    .string()
    .min(1, "組織名を入力してください")
    .max(100, "組織名は100文字以下で入力してください"),
});

export type SetupInput = z.infer<typeof SetupSchema>;

// ビジネスエラー
export class UserCreationError extends Error {
  constructor() {
    super("ユーザーの作成に失敗しました");
    this.name = "UserCreationError";
  }
}

export class OrganizationCreationError extends Error {
  constructor() {
    super("組織の作成に失敗しました");
    this.name = "OrganizationCreationError";
  }
}

/**
 * ユーザーIDに基づいてユーザーデータを取得するサービスです。
 *
 * @param db - データベースインスタンス。
 * @param userId - 取得するユーザーのID。
 * @returns ユーザーオブジェクト。ユーザーが見つからない場合はnullを返します。
 */
export async function getUserById(db: Database, userId: string) {
  const users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  return users[0] || null;
}

/**
 * ユーザーデータと組織を作成し、ユーザーを組織の管理者として紐付ける初期設定処理を行います。
 *
 * この関数は、指定されたユーザーIDでユーザー情報を設定（存在しない場合は新規作成）し、
 * 新しい組織を作成後、そのユーザーを組織の管理者として登録します。
 * すべての操作は単一のデータベーストランザクション内で実行されます。
 *
 * @param db - データベースへの接続を提供するDrizzleインスタンス。
 * @param userId - 設定または作成するユーザーのID。
 * @param input - 初期設定に必要な情報。以下のプロパティを含みます:
 *   - `userName`: 作成または更新するユーザーの名前。
 *   - `organizationName`: 作成する組織の名前。
 * @returns データベース操作が成功した場合、作成されたユーザー、組織、および
 *          管理者としてのメンバーシップ情報を含むオブジェクトを解決するPromise。
 * @throws UserCreationError - ユーザーの作成または取得に失敗した場合。
 * @throws OrganizationCreationError - 組織の作成に失敗した場合。
 */
export async function setupUserAndOrganization(
  db: Database,
  userId: string,
  input: SetupInput
) {
  return db.transaction(async (tx) => {
    // ユーザーの重複チェック
    const existingUser = await tx
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    let user = existingUser[0];
    if (!user) {
      // ユーザー作成
      const userResult = await tx
        .insert(usersTable)
        .values({
          id: userId,
          name: input.userName,
        })
        .returning();

      user = userResult[0]!;
    } else {
      // ユーザー名の更新
      const updatedUserResult = await tx
        .update(usersTable)
        .set({ name: input.userName })
        .where(eq(usersTable.id, userId))
        .returning();

      user = updatedUserResult[0]!;
    }

    if (!user) {
      throw new UserCreationError();
    }

    // 組織作成
    const organizationResult = await withUniqueIdRetry(
      (organizationId: string) =>
        tx
          .insert(organizationsTable)
          .values({
            id: organizationId,
            name: input.organizationName,
            description: `${input.organizationName}の組織`,
          })
          .returning(),
      { idPrefix: DEFAULT_UUID_CONFIG.organization.idPrefix }
    );

    const organization = organizationResult[0]!;
    if (!organization) {
      throw new OrganizationCreationError();
    }

    // メンバーシップ作成（管理者として）
    const membershipResult = await withUniqueIdRetry(
      (membershipId: string) =>
        tx
          .insert(organizationMembersTable)
          .values({
            id: membershipId,
            userId: user.id,
            organizationId: organization.id,
            role: MemberRoleSchema.enum.admin,
          })
          .returning(),
      { idPrefix: DEFAULT_UUID_CONFIG.organization.idPrefix }
    );

    const membership = membershipResult[0]!;

    return {
      user,
      organization,
      membership,
    };
  });
}

/**
 * ユーザーの初期設定状態を確認します。
 *
 * @param db - データベースインスタンス。
 * @param userId - 確認するユーザーのID。
 * @returns ユーザーの設定状態情報を含むオブジェクト。
 */
export async function checkUserSetupStatus(db: Database, userId: string) {
  // ユーザー情報を取得
  const user = await getUserById(db, userId);

  if (!user) {
    return {
      isCompleted: false,
      hasUser: false,
      hasOrganization: false,
    };
  }

  // ユーザーが所属する組織があるかチェック
  const membershipResult = await db
    .select({
      organizationId: organizationMembersTable.organizationId,
    })
    .from(organizationMembersTable)
    .where(eq(organizationMembersTable.userId, userId))
    .limit(1);

  const hasOrganization = membershipResult.length > 0;

  return {
    isCompleted: hasOrganization,
    hasUser: true,
    hasOrganization,
  };
}
