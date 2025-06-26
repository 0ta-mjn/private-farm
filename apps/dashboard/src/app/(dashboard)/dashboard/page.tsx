"use client";

import { PlusIcon, MapIcon, BellIcon } from "lucide-react";
import { Button } from "@/shadcn/button";
import Link from "next/link";
import { useDiaryDrawerActions } from "@/contexts/diary-drawer-context";
import { useOrganization } from "@/contexts/organization-context";
import { DiarySummary } from "@/app/(dashboard)/dashboard/diary-summary";

export default function DashboardPage() {
  const diaryDrawerActions = useDiaryDrawerActions();
  const { currentOrganizationId } = useOrganization();

  return (
    <div className="container mx-auto pb-8 space-y-6">
      <h1 className="sr-only">ダッシュボードホーム</h1>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button
          variant="outline"
          className="flex items-center gap-3 p-4 h-auto justify-start"
          onClick={diaryDrawerActions.openCreate}
        >
          <div className="p-2 bg-primary/10 rounded-lg">
            <PlusIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-card-foreground">日誌登録</h3>
            <p className="text-sm text-muted-foreground">農作業の記録を追加</p>
          </div>
        </Button>

        <Button
          asChild
          variant="outline"
          className="flex items-center gap-3 p-4 h-auto justify-start"
        >
          <Link href="/things">
            <div className="p-2 bg-primary-light/20 rounded-lg">
              <MapIcon className="h-5 w-5 text-primary-light" />
            </div>
            <div className="text-left">
              <h3 className="font-medium text-card-foreground">区画管理</h3>
              <p className="text-sm text-muted-foreground">
                農地区画の設定・管理
              </p>
            </div>
          </Link>
        </Button>

        <Button
          asChild
          variant="outline"
          className="flex items-center gap-3 p-4 h-auto justify-start"
        >
          <Link href="/organization/settings?settings=notifications">
            <div className="p-2 bg-accent/20 rounded-lg">
              <BellIcon className="h-5 w-5 text-accent" />
            </div>
            <div className="text-left">
              <h3 className="font-medium text-card-foreground">通知設定</h3>
              <p className="text-sm text-muted-foreground">
                アラートの設定・管理
              </p>
            </div>
          </Link>
        </Button>
      </div>

      {/* Diary Summary */}
      {currentOrganizationId && (
        <DiarySummary organizationId={currentOrganizationId} />
      )}
    </div>
  );
}
