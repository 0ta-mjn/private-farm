import { z } from "zod";
import { eq, withUniqueIdRetry, and } from "@repo/db";
import {
  organizationsTable,
  organizationMembersTable,
  MemberRoleSchema,
} from "@repo/db/schema";
import {
  DEFAULT_UUID_CONFIG,
  OrganizationCreationError,
  MembershipCreationError,
  OrganizationUpdateError,
} from "@repo/config";
import type { Database, Transaction } from "@repo/db/client";

// バリデーションスキーマ
export const CreateOrganizationSchema = z.object({
  organizationName: z
    .string()
    .min(1, "組織名を入力してください")
    .max(100, "組織名は100文字以下で入力してください"),
  description: z.string().optional(),
});

export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>;

// 組織更新用のスキーマ
export const UpdateOrganizationSchema = z.object({
  name: z
    .string()
    .min(1, "組織名を入力してください")
    .max(100, "組織名は100文字以下で入力してください"),
  description: z.string().optional(),
});

export type UpdateOrganizationInput = z.infer<typeof UpdateOrganizationSchema>;

/**
 * 組織作成のコア処理（トランザクション内で実行される）
 *
 * @param tx - データベーストランザクション
 * @param userId - 組織を作成するユーザーのID
 * @param input - 組織作成に必要な情報
 * @returns 作成された組織とメンバーシップ情報
 */
export async function createOrganizationCore(
  tx: Transaction, // トランザクション型
  userId: string,
  input: CreateOrganizationInput
) {
  // 組織作成
  const organizationResult = await withUniqueIdRetry(
    (organizationId: string) =>
      tx
        .insert(organizationsTable)
        .values({
          id: organizationId,
          name: input.organizationName,
          description: input.description,
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
          userId: userId,
          organizationId: organization.id,
          role: MemberRoleSchema.enum.admin,
        })
        .returning(),
    { idPrefix: DEFAULT_UUID_CONFIG.organization.idPrefix }
  );

  const membership = membershipResult[0]!;
  if (!membership) {
    throw new MembershipCreationError();
  }

  return {
    organization,
    membership,
  };
}

/**
 * 新しい組織を作成し、作成者を管理者として組織に追加します。
 *
 * この関数は、新しい組織を作成し、指定されたユーザーを組織の管理者として
 * 自動的に追加します。すべての操作は単一のデータベーストランザクション内で実行されます。
 *
 * @param db - データベースへの接続を提供するDrizzleインスタンス。
 * @param userId - 組織を作成するユーザーのID（管理者になるユーザー）。
 * @param input - 組織作成に必要な情報。以下のプロパティを含みます:
 *   - `organizationName`: 作成する組織の名前。
 *   - `description`: 組織の説明（オプション）。
 * @returns データベース操作が成功した場合、作成された組織および
 *          管理者としてのメンバーシップ情報を含むオブジェクトを解決するPromise。
 * @throws OrganizationCreationError - 組織の作成に失敗した場合。
 * @throws MembershipCreationError - メンバーシップの作成に失敗した場合。
 */
export async function createOrganization(
  db: Database,
  userId: string,
  input: CreateOrganizationInput
) {
  return db.transaction(async (tx) => {
    return await createOrganizationCore(tx, userId, input);
  });
}

/**
 * ユーザーが所属する組織の一覧を取得します。
 *
 * @param db - データベースインスタンス。
 * @param userId - 対象ユーザーのID。
 * @returns ユーザーが所属する組織の一覧。
 */
export async function getUserOrganizations(db: Database, userId: string) {
  const organizationsWithMembership = await db
    .select({
      organization: {
        id: organizationsTable.id,
        name: organizationsTable.name,
        description: organizationsTable.description,
        createdAt: organizationsTable.createdAt,
        updatedAt: organizationsTable.updatedAt,
      },
      membership: {
        id: organizationMembersTable.id,
        role: organizationMembersTable.role,
        createdAt: organizationMembersTable.createdAt,
      },
    })
    .from(organizationMembersTable)
    .innerJoin(
      organizationsTable,
      eq(organizationMembersTable.organizationId, organizationsTable.id)
    )
    .where(eq(organizationMembersTable.userId, userId))
    .orderBy(organizationsTable.createdAt);

  return organizationsWithMembership.map((item) => ({
    ...item.organization,
    role: item.membership.role,
    joinedAt: item.membership.createdAt,
  }));
}

/**
 * 特定の組織の詳細情報を取得します。
 *
 * @param db - データベースインスタンス。
 * @param organizationId - 取得する組織のID。
 * @param userId - リクエストを行うユーザーのID（権限チェック用）。
 * @returns 組織の詳細情報。権限がない場合はnullを返します。
 */
export async function getOrganizationById(
  db: Database,
  organizationId: string,
  userId: string
) {
  // ユーザーが組織のメンバーであることを確認
  const membershipResult = await db
    .select({
      organization: {
        id: organizationsTable.id,
        name: organizationsTable.name,
        description: organizationsTable.description,
        createdAt: organizationsTable.createdAt,
        updatedAt: organizationsTable.updatedAt,
      },
      membership: {
        id: organizationMembersTable.id,
        role: organizationMembersTable.role,
        createdAt: organizationMembersTable.createdAt,
      },
    })
    .from(organizationMembersTable)
    .innerJoin(
      organizationsTable,
      eq(organizationMembersTable.organizationId, organizationsTable.id)
    )
    .where(
      and(
        eq(organizationMembersTable.userId, userId),
        eq(organizationsTable.id, organizationId)
      )
    )
    .limit(1);

  const result = membershipResult[0];
  if (!result) {
    return null;
  }

  return {
    ...result.organization,
    role: result.membership.role,
    joinedAt: result.membership.createdAt,
  };
}

/**
 * 組織の情報を更新します。
 *
 * @param db - データベースインスタンス。
 * @param organizationId - 更新する組織のID。
 * @param userId - 更新を行うユーザーのID（権限チェック用）。
 * @param input - 更新する組織の情報。
 * @returns 更新された組織の情報。
 */
export async function updateOrganization(
  db: Database,
  organizationId: string,
  userId: string,
  input: UpdateOrganizationInput
) {
  // 組織情報を更新
  const updateResult = await db
    .update(organizationsTable)
    .set({
      name: input.name,
      description: input.description,
      updatedAt: new Date(),
    })
    .where(eq(organizationsTable.id, organizationId))
    .returning();

  const updatedOrganization = updateResult[0];
  if (!updatedOrganization) {
    throw new OrganizationUpdateError("組織の更新に失敗しました");
  }

  return updatedOrganization;
}

/**
 * 組織削除のコア処理
 *
 * @param db - データベース接続
 * @param organizationId - 削除する組織のID
 * @param userId - 削除を実行するユーザーのID（権限チェック用）
 * @returns 削除された組織の情報
 */
export async function deleteOrganization(
  db: Database,
  organizationId: string
): Promise<{ id: string; name: string }> {
  return await db.transaction(async (tx) => {
    // 関連するメンバーシップを削除
    await tx
      .delete(organizationMembersTable)
      .where(eq(organizationMembersTable.organizationId, organizationId));

    // 組織を削除
    const deletedOrganizations = await tx
      .delete(organizationsTable)
      .where(eq(organizationsTable.id, organizationId))
      .returning({
        id: organizationsTable.id,
        name: organizationsTable.name,
      });

    const deletedOrganization = deletedOrganizations[0];
    if (!deletedOrganization) {
      throw new OrganizationUpdateError("組織の削除に失敗しました");
    }

    return deletedOrganization;
  });
}
