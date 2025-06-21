"use client";

import { useOrganization } from "@/contexts/organization-context";
import { DeleteOrganization } from "@/components/organization/delete-organization";
import { OrganizationDiscordSettings } from "@/components/organization/organization-discord-settings";
import { Separator } from "@/shadcn/separator";
import { Skeleton } from "@/shadcn/skeleton";
import { OrganizationProfileSettings } from "@/components/organization/organization-profile-settings";

export default function OrganizationSettingsPage() {
  const { currentOrganizationId } = useOrganization();

  if (!currentOrganizationId) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-6">
          {/* ページヘッダーのスケルトン */}
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-80" />
          </div>

          <Separator />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto pb-8 space-y-6">
      {/* ページヘッダー */}
      <div>
        <h1 className="text-3xl font-bold">組織設定</h1>
        <p className="text-muted-foreground">組織の基本情報を管理します。</p>
      </div>

      <Separator />

      {/* 基本情報 */}
      <OrganizationProfileSettings organizationId={currentOrganizationId} />

      {/* Discord通知設定 */}
      <OrganizationDiscordSettings organizationId={currentOrganizationId} />

      {/* 危険ゾーン */}
      <DeleteOrganization organizationId={currentOrganizationId} />
    </div>
  );
}
