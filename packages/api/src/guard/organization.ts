import { TRPCError } from "@trpc/server";
import { eq, and } from "@repo/db";
import { organizationMembersTable, MemberRoleSchema } from "@repo/db/schema";
import type { Database } from "@repo/db/client";
import { z } from "zod";

// roleオプションの型定義
type MemberRole = z.infer<typeof MemberRoleSchema>;

/**
 * ユーザーが指定された組織のメンバーかどうかをチェックし、
 * メンバーでない場合やroleが指定されている場合にroleチェックも行い、
 * 条件を満たさない場合はTRPCErrorをスローするガード関数
 *
 * @param db - データベースインスタンス
 * @param userId - ユーザーID
 * @param organizationId - 組織ID
 * @param role - オプション: 必要な役割（指定された場合のみチェック）
 * @throws {TRPCError} ユーザーが組織のメンバーでない場合、必要な役割を持たない場合、またはチェックに失敗した場合
 */
export async function guardOrganizationMembership(
  db: Database,
  userId: string,
  organizationId: string,
  role?: MemberRole
): Promise<void> {
  try {
    const membershipResult = await db
      .select({
        id: organizationMembersTable.id,
        role: organizationMembersTable.role,
      })
      .from(organizationMembersTable)
      .where(
        and(
          eq(organizationMembersTable.userId, userId),
          eq(organizationMembersTable.organizationId, organizationId)
        )
      )
      .limit(1);

    if (membershipResult.length === 0) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "この組織にアクセスする権限がありません",
      });
    }

    // roleが指定されている場合、役割もチェック
    if (role !== undefined) {
      const userRole = membershipResult[0]!.role;
      if (userRole !== role) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `この操作には${role}権限が必要です`,
        });
      }
    }
  } catch (error) {
    // 既にTRPCErrorの場合はそのまま再スロー
    if (error instanceof TRPCError) {
      throw error;
    }

    // データベースエラーの場合は内部サーバーエラーとして処理
    console.error("Organization membership check failed:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "組織メンバーシップの確認中にエラーが発生しました",
    });
  }
}
