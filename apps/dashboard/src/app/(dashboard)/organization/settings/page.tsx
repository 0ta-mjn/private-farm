"use client";

import { useOrganization } from "@/contexts/organization-context";
import { DeleteOrganization } from "@/app/(dashboard)/organization/settings/delete-organization";
import { OrganizationDiscordSettings } from "@/app/(dashboard)/organization/settings/organization-discord-settings";
import { Separator } from "@/shadcn/separator";
import { Skeleton } from "@/shadcn/skeleton";
import { OrganizationProfileSettings } from "@/app/(dashboard)/organization/settings/organization-profile-settings";
import { useSearchParams } from "next/navigation";

export default function OrganizationSettingsPage() {
  const { currentOrganizationId } = useOrganization();
  const searchParams = useSearchParams();
  const settings = searchParams.get("settings");

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
        <p className="text-muted-foreground">
          組織の基本情報と通知設定を管理します。
        </p>
      </div>

      <Separator />

      {/* 基本情報 */}
      <OrganizationProfileSettings organizationId={currentOrganizationId} />

      {/* Discord通知設定 */}
      <OrganizationDiscordSettings
        organizationId={currentOrganizationId}
        focused={settings === "notifications"}
      />

      {/* 危険ゾーン */}
      <DeleteOrganization organizationId={currentOrganizationId} />
    </div>
  );
}
