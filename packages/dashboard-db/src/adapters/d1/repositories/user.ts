import {
  UserRepository,
  SetupInput,
  UserProfileUpdateInput,
  SetupResult,
  UserSetupStatus,
  UserSidebarData,
  User,
} from "../../../interfaces/user";
import {
  usersTable,
  organizationsTable,
  organizationMembersTable,
} from "../schema";
import { and, eq, desc, sql, count, inArray } from "drizzle-orm";
import { Database } from "../client";
import type { OrganizationWithRole } from "../../../interfaces/organization";
import { MemberRole } from "../../../interfaces/organization";
import { D1OrganizationRepo } from "./organization";
import { DashboardDBError } from "../../../errors";

export class D1UserRepo implements UserRepository {
  constructor(private db: Database) {}

  async findById(userId: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .get();
    return result || null;
  }

  async setup(userId: string, input: SetupInput): Promise<SetupResult> {
    // TODO D1がトランザクションに対応したら、トランザクションを使用
    // ユーザーの重複チェックと作成/更新
    const existingUser = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .get();

    let user = existingUser;
    if (!user) {
      // ユーザー作成
      const userRows = await this.db
        .insert(usersTable)
        .values({
          id: userId,
          name: input.userName,
        })
        .returning();
      user = userRows[0];
    } else {
      // ユーザー名の更新
      const userRows = await this.db
        .update(usersTable)
        .set({ name: input.userName, updatedAt: new Date() })
        .where(eq(usersTable.id, userId))
        .returning();
      user = userRows[0];
    }

    if (!user) {
      throw new DashboardDBError(
        "internal_error",
        "Failed to create or update user"
      );
    }

    // 組織作成（D1OrganizationRepoの静的createCoreメソッドを使用）
    const organizationResult = await D1OrganizationRepo.createCore(
      this.db,
      user.id,
      {
        organizationName: input.organizationName,
      }
    );

    if (!organizationResult) {
      throw new DashboardDBError(
        "internal_error",
        "Failed to create organization"
      );
    }

    return {
      user,
      organization: organizationResult.organization,
      membership: organizationResult.membership,
    };
  }

  async checkSetupStatus(userId: string): Promise<UserSetupStatus> {
    // ユーザー情報を取得
    const user = await this.findById(userId);

    if (!user) {
      return {
        isCompleted: false,
        hasUser: false,
        hasOrganization: false,
        user: null,
      };
    }

    // ユーザーが所属する組織があるかチェック
    const membershipResult = await this.db
      .select({
        organizationId: organizationMembersTable.organizationId,
      })
      .from(organizationMembersTable)
      .where(eq(organizationMembersTable.userId, userId))
      .limit(1)
      .all();

    const hasOrganization = membershipResult.length > 0;

    return {
      isCompleted: hasOrganization,
      hasUser: true,
      hasOrganization,
      user,
    };
  }

  async getSidebarData(userId: string): Promise<UserSidebarData> {
    // ユーザー情報を取得
    const user = await this.findById(userId);

    if (!user) {
      throw new DashboardDBError("not_found", "User not found");
    }

    // ユーザーが所属する組織とメンバーシップ情報を取得
    const organizationsWithMembership = await this.db
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
      )
      .all();

    // デフォルト組織（最も最近閲覧した組織、または最も古くから所属している組織）を設定
    const defaultOrganization =
      organizationsWithMembership[0]?.organization || null;

    const organizations: OrganizationWithRole[] =
      organizationsWithMembership.map((item) => ({
        ...item.organization,
        role: MemberRole.safeParse(item.membership.role).data || null,
        joinedAt: item.membership.createdAt,
      }));

    return {
      user: {
        id: user.id,
        name: user.name,
      },
      organizations,
      defaultOrganization,
    };
  }

  async updateProfile(
    userId: string,
    input: UserProfileUpdateInput
  ): Promise<User> {
    const rows = await this.db
      .update(usersTable)
      .set({
        name: input.name,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, userId))
      .returning();
    const result = rows[0];
    if (!result) {
      throw new DashboardDBError(
        "not_found",
        `User with id ${userId} not found`
      );
    }
    return result;
  }

  async updateOrganizationLatestViewedAt(
    userId: string,
    organizationId: string
  ): Promise<boolean> {
    try {
      const rows = await this.db
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
      return rows.length > 0;
    } catch (error) {
      console.error("Failed to update organization latest viewed at:", error);
      return false;
    }
  }

  /**
   * ユーザーが唯一のメンバーである組織を取得するヘルパー関数
   */
  private async getOrganizationsWithSingleMember(
    userId: string
  ): Promise<string[]> {
    // Step 1: ユーザーが所属する組織IDを取得
    const userOrganizations = await this.db
      .select({
        organizationId: organizationMembersTable.organizationId,
      })
      .from(organizationMembersTable)
      .where(eq(organizationMembersTable.userId, userId))
      .all();

    if (userOrganizations.length === 0) {
      return [];
    }

    const userOrgIds = userOrganizations.map((org) => org.organizationId);

    // Step 2: ユーザーが所属する組織の中で、メンバー数が1の組織のみを取得
    const singleMemberOrganizations = await this.db
      .select({
        organizationId: organizationMembersTable.organizationId,
      })
      .from(organizationMembersTable)
      .where(inArray(organizationMembersTable.organizationId, userOrgIds))
      .groupBy(organizationMembersTable.organizationId)
      .having(eq(count(), 1))
      .all();

    return singleMemberOrganizations.map((org) => org.organizationId);
  }

  async delete(userId: string): Promise<boolean> {
    // ユーザーが唯一のメンバーである組織を取得して削除
    const singleMemberOrganizations =
      await this.getOrganizationsWithSingleMember(userId);

    for (const organizationId of singleMemberOrganizations) {
      try {
        await this.db
          .delete(organizationsTable)
          .where(eq(organizationsTable.id, organizationId))
          .returning();
        console.log(
          `Deleted organization ${organizationId} as user ${userId} was the only member`
        );
      } catch (error) {
        console.error(
          `Failed to delete organization ${organizationId}:`,
          error
        );
        // 組織削除の失敗はユーザー削除を停止させない（ログのみ記録）
      }
    }

    // ユーザーを削除
    const deletedUsers = await this.db
      .delete(usersTable)
      .where(eq(usersTable.id, userId))
      .returning({ id: usersTable.id });

    return deletedUsers.length > 0;
  }
}
