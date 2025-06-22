import { z } from "zod";
import { eq, desc, and, sql, count, inArray } from "@repo/db";
import {
  usersTable,
  organizationsTable,
  organizationMembersTable,
} from "@repo/db/schema";
import type { Database } from "@repo/db/client";
import {
  createOrganizationCore,
  deleteOrganization,
} from "./organization.service";

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

    if (!user) return undefined;

    // 共通の組織作成関数を使用
    const organizationResponse = await createOrganizationCore(tx, user.id, {
      organizationName: input.organizationName,
    });
    if (!organizationResponse) {
      return undefined;
    }

    return {
      user,
      organization: organizationResponse.organization,
      membership: organizationResponse.membership,
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
      user,
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
    user,
  };
}

/**
 * サイドバー表示に必要なユーザーと組織の情報を取得します。
 *
 * @param db - データベースインスタンス。
 * @param userId - 対象ユーザーのID。
 * @returns ユーザー情報、所属組織一覧、デフォルト組織を含むオブジェクト。
 */
export async function getUserSidebarData(db: Database, userId: string) {
  // ユーザー情報を取得
  const user = await getUserById(db, userId);

  if (!user) {
    return null;
  }

  // ユーザーが所属する組織とメンバーシップ情報を取得
  const organizationsWithMembership = await db
    .select({
      organization: {
        id: organizationsTable.id,
        name: organizationsTable.name,
        description: organizationsTable.description,
        updatedAt: organizationsTable.updatedAt,
      },
      membership: {
        id: organizationMembersTable.id,
        role: organizationMembersTable.role,
        latestViewedAt: organizationMembersTable.latestViewedAt,
        createdAt: organizationMembersTable.createdAt,
      },
    })
    .from(organizationMembersTable)
    .innerJoin(
      organizationsTable,
      eq(organizationMembersTable.organizationId, organizationsTable.id)
    )
    .where(eq(organizationMembersTable.userId, userId))
    .orderBy(
      sql`${organizationMembersTable.latestViewedAt} DESC NULLS LAST`, // NULL値は最後に
      desc(organizationMembersTable.createdAt) // latestViewedAtがnullの場合は作成日時順
    );

  // デフォルト組織（最も最近閲覧した組織、または最も古くから所属している組織）を設定
  const defaultOrganization =
    organizationsWithMembership[0]?.organization || null;

  return {
    user: {
      id: user.id,
      name: user.name,
    },
    organizations: organizationsWithMembership.map((item) => ({
      ...item.organization,
      role: item.membership.role,
      joinedAt: item.membership.createdAt,
    })),
    defaultOrganization,
  };
}

/**
 * ユーザーの組織最後閲覧日時を更新します。
 *
 * @param db - データベースインスタンス。
 * @param userId - 対象ユーザーのID。
 * @param organizationId - 閲覧した組織のID。
 * @returns 更新処理が成功した場合はtrue、失敗した場合はfalse。
 */
export async function updateOrganizationLatestViewedAt(
  db: Database,
  userId: string,
  organizationId: string
) {
  try {
    const result = await db
      .update(organizationMembersTable)
      .set({
        latestViewedAt: new Date(),
      })
      .where(
        and(
          eq(organizationMembersTable.userId, userId),
          eq(organizationMembersTable.organizationId, organizationId)
        )
      )
      .returning({ id: organizationMembersTable.id });

    // 更新された行が0の場合は、ユーザーが組織のメンバーでないか、存在しない
    return result.length > 0;
  } catch (error) {
    console.error("Failed to update organization latest viewed at:", error);
    return false;
  }
}

/**
 * ユーザーのプロフィール情報を更新します。
 *
 * @param db - データベースインスタンス。
 * @param userId - 更新するユーザーのID。
 * @param input - 更新するプロフィール情報。
 * @returns 更新されたユーザー情報。ユーザーが見つからない場合はnullを返します。
 */
export async function updateUserProfile(
  db: Database,
  userId: string,
  input: { name: string }
) {
  try {
    const result = await db
      .update(usersTable)
      .set({
        name: input.name,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, userId))
      .returning({
        id: usersTable.id,
        name: usersTable.name,
        updatedAt: usersTable.updatedAt,
      });

    return result[0] || null;
  } catch (error) {
    console.error("Failed to update user profile:", error);
    throw error;
  }
}

/**
 * ユーザーが唯一のメンバーである組織を取得するヘルパー関数
 *
 * @param db - データベースインスタンス
 * @param userId - 対象ユーザーのID
 * @returns ユーザーが唯一のメンバーである組織のIDリスト
 */
async function getOrganizationsWithSingleMember(
  db: Database,
  userId: string
): Promise<string[]> {
  // Step 1: ユーザーが所属する組織IDを取得
  const userOrganizations = await db
    .select({
      organizationId: organizationMembersTable.organizationId,
    })
    .from(organizationMembersTable)
    .where(eq(organizationMembersTable.userId, userId));

  if (userOrganizations.length === 0) {
    return [];
  }

  const userOrgIds = userOrganizations.map((org) => org.organizationId);

  // Step 2: ユーザーが所属する組織の中で、メンバー数が1の組織のみを取得
  const singleMemberOrganizations = await db
    .select({
      organizationId: organizationMembersTable.organizationId,
    })
    .from(organizationMembersTable)
    .where(inArray(organizationMembersTable.organizationId, userOrgIds))
    .groupBy(organizationMembersTable.organizationId)
    .having(eq(count(), 1));

  return singleMemberOrganizations.map((org) => org.organizationId);
}

/**
 * ユーザーアカウントを削除するサービスです。
 *
 * この関数は以下の処理を順次実行します：
 * 1. ユーザーが存在するかチェック
 * 2. ユーザーが唯一のメンバーである組織を削除
 * 3. ユーザーに関連するすべてのデータを削除（カスケード削除）
 * 4. 最後にユーザー自身を削除
 *
 * @param db - データベースインスタンス。
 * @param userId - 削除するユーザーのID。
 * @returns 削除が成功した場合はtrue、ユーザーが見つからない場合はfalseを返します。
 * @throws UserDeletionError - 削除処理でエラーが発生した場合。
 */
export async function deleteUserAccount(
  db: Database,
  userId: string
): Promise<boolean> {
  // ユーザーが唯一のメンバーである組織を取得して削除
  const singleMemberOrganizations = await getOrganizationsWithSingleMember(
    db,
    userId
  );

  for (const organizationId of singleMemberOrganizations) {
    try {
      await deleteOrganization(db, organizationId);
      console.log(
        `Deleted organization ${organizationId} as user ${userId} was the only member`
      );
    } catch (error) {
      console.error(`Failed to delete organization ${organizationId}:`, error);
      // 組織削除の失敗はユーザー削除を停止させない（ログのみ記録）
    }
  }

  // ユーザーを削除
  const deletedUsers = await db
    .delete(usersTable)
    .where(eq(usersTable.id, userId))
    .returning({ id: usersTable.id });

  return deletedUsers.length > 0;
}
