import {
  OrganizationRepository,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  OrganizationWithRole,
  CreateOrganizationResult,
  MemberRole,
  OrganizationMembership,
  MembershipParams,
  OrganizationWithNotification,
} from "../../../interfaces/organization";
import {
  organizationsTable,
  organizationMembersTable,
  discordChannelsTable,
} from "../schema";
import { withUniqueIdRetry } from "../utils";
import { and, eq } from "drizzle-orm";
import { Database, Transaction } from "../client";
import { DashboardDBError } from "../../../errors";
import { DEFAULT_UUID_CONFIG, DiscordNotificationSettings } from "@repo/config";
import { decrypt } from "../../../encryption";

export class D1OrganizationRepo implements OrganizationRepository {
  constructor(
    private db: Database,
    private encryptionKey: string // 暗号化キーが必要な場合はここで指定
  ) {}

  async create(
    userId: string,
    input: CreateOrganizationInput
  ): Promise<CreateOrganizationResult> {
    // TODO D1がトランザクションに対応したら、トランザクションを使用
    const result = await D1OrganizationRepo.createCore(this.db, userId, input);
    if (!result) {
      throw new DashboardDBError(
        "internal_error",
        "Failed to create organization"
      );
    }
    return result;
  }

  /**
   * 組織作成のコア処理（トランザクション内で実行される）
   *
   * @param tx - データベーストランザクション
   * @param userId - 組織を作成するユーザーのID
   * @param input - 組織作成に必要な情報
   * @returns 作成された組織とメンバーシップ情報
   */
  static async createCore(
    tx: Transaction | Database,
    userId: string,
    input: CreateOrganizationInput
  ): Promise<CreateOrganizationResult | undefined> {
    // 組織作成
    const orgRows = await withUniqueIdRetry(
      (orgId: string) =>
        tx
          .insert(organizationsTable)
          .values({
            id: orgId,
            name: input.organizationName,
            description: input.description ?? null,
          })
          .returning(),
      { idPrefix: DEFAULT_UUID_CONFIG.organization.idPrefix }
    );
    const organization = orgRows[0];
    if (!organization) {
      return undefined; // 組織の作成に失敗した場合はundefinedを返す
    }

    // メンバーシップ作成（管理者として）
    const memberRows = await withUniqueIdRetry(
      (membershipId: string) =>
        tx
          .insert(organizationMembersTable)
          .values({
            id: membershipId,
            userId,
            organizationId: organization.id,
            role: "admin",
          })
          .returning(),
      { idPrefix: DEFAULT_UUID_CONFIG.membership.idPrefix }
    );
    const membership = memberRows[0];
    if (!membership) {
      return undefined; // メンバーシップの作成に失敗した場合はundefinedを返す
    }

    // roleをMemberRole型に変換
    const fixedMembership: OrganizationMembership = {
      ...membership,
      role: MemberRole.safeParse(membership.role).data || null,
    };

    return { organization, membership: fixedMembership };
  }

  async findById(id: string): Promise<OrganizationWithRole | null> {
    // 組織+ロール取得（最初のメンバーを返す）
    const rows = await this.db
      .select({
        id: organizationsTable.id,
        name: organizationsTable.name,
        description: organizationsTable.description,
        createdAt: organizationsTable.createdAt,
        updatedAt: organizationsTable.updatedAt,
        role: organizationMembersTable.role,
        joinedAt: organizationMembersTable.createdAt,
      })
      .from(organizationsTable)
      .innerJoin(
        organizationMembersTable,
        eq(organizationsTable.id, organizationMembersTable.organizationId)
      )
      .where(eq(organizationsTable.id, id))
      .limit(1);
    const result = rows[0];
    if (!result) return null;
    return {
      ...result,
      role: MemberRole.parse(result.role),
    };
  }

  async listByUser(userId: string): Promise<OrganizationWithRole[]> {
    const rows = await this.db
      .select({
        id: organizationsTable.id,
        name: organizationsTable.name,
        description: organizationsTable.description,
        createdAt: organizationsTable.createdAt,
        updatedAt: organizationsTable.updatedAt,
        role: organizationMembersTable.role,
        joinedAt: organizationMembersTable.createdAt,
      })
      .from(organizationMembersTable)
      .innerJoin(
        organizationsTable,
        eq(organizationMembersTable.organizationId, organizationsTable.id)
      )
      .where(eq(organizationMembersTable.userId, userId))
      .orderBy(organizationsTable.createdAt)
      .all();
    return rows.map((row) => ({
      ...row,
      role: MemberRole.safeParse(row.role).data || null,
    }));
  }

  async update(id: string, input: UpdateOrganizationInput) {
    const rows = await this.db
      .update(organizationsTable)
      .set({
        name: input.name,
        description: input.description,
        updatedAt: new Date(),
      })
      .where(eq(organizationsTable.id, id))
      .returning();
    const result = rows[0];
    if (!result)
      throw new DashboardDBError("not_found", `Organization ${id} not found`);
    return result;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.db
      .delete(organizationsTable)
      .where(eq(organizationsTable.id, id))
      .returning();
    return rows.length > 0;
  }

  async checkMembership(
    { userId, organizationId }: MembershipParams,
    role?: MemberRole
  ): Promise<void> {
    const membershipResult = await this.db
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
      throw new DashboardDBError(
        "forbidden",
        "no permission to access this organization"
      );
    }

    // roleが指定されている場合、役割もチェック
    if (role !== undefined) {
      const userRole = membershipResult[0]!.role;
      if (userRole !== role) {
        throw new DashboardDBError(
          "forbidden",
          `${role} permission is required`
        );
      }
    }
  }

  async findAllWithNotification(
    notificationType: keyof Pick<
      DiscordNotificationSettings,
      "daily" | "weekly" | "monthly"
    >
  ): Promise<OrganizationWithNotification[]> {
    const results = await this.db
      .select({
        organizationId: discordChannelsTable.organizationId,
        organizationName: organizationsTable.name,
        channelUuid: discordChannelsTable.id,
        channelName: discordChannelsTable.name,
        webhookId: discordChannelsTable.webhookId,
        webhookTokenEnc: discordChannelsTable.webhookTokenEnc,
        notificationSettings: discordChannelsTable.notificationSettings,
      })
      .from(discordChannelsTable)
      .innerJoin(
        organizationsTable,
        eq(discordChannelsTable.organizationId, organizationsTable.id)
      );

    // 指定された通知タイプが有効なもののみフィルタリング
    const filteredResults = results.filter(
      (result) => result.notificationSettings?.[notificationType] === true
    );

    // 組織ごとにグルーピング
    const organizationMap = new Map<string, OrganizationWithNotification>();
    for (const result of filteredResults) {
      if (!organizationMap.has(result.organizationId)) {
        organizationMap.set(result.organizationId, {
          organizationId: result.organizationId,
          organizationName: result.organizationName,
          channels: [],
        });
      }

      const org = organizationMap.get(result.organizationId)!;
      if (result.webhookId && result.webhookTokenEnc) {
        const webhookToken = await this.decryptWebhookToken(
          result.webhookTokenEnc
        );
        org.channels.push({
          channelUuid: result.channelUuid,
          channelName: result.channelName,
          notificationSettings: result.notificationSettings,
          webhookId: result.webhookId,
          webhookToken: webhookToken, // 復号化されたトークン
        });
      }
    }

    return Array.from(organizationMap.values());
  }

  private decryptWebhookToken(encryptedToken: string): Promise<string> {
    return decrypt(encryptedToken, this.encryptionKey);
  }
}
