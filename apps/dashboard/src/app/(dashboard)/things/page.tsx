"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useOrganization } from "@/contexts/organization-context";
import { Button } from "@/shadcn/button";
import { useThingDrawerActions } from "@/contexts/thing-drawer-context";
import { ThingAccordionItem } from "@/components/thing/thing-accordion";
import { useState } from "react";
import { DeleteThingDialog } from "@/components/thing/delete-thing-dialog";
import { things as thingsFactory } from "@/rpc/factory";

export default function ThingsPage() {
  const { currentOrganizationId } = useOrganization();

  const actions = useThingDrawerActions();
  const [deletingThingId, setDeletingThingId] = useState<string | null>(null);

  // 区画一覧の取得
  const { data: things, isLoading: isLoadingFields } = useQuery({
    ...thingsFactory.list(currentOrganizationId || ""),
    enabled: !!currentOrganizationId,
  });

  if (isLoadingFields || !currentOrganizationId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto pb-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">区画・センサー管理</h1>
          <p className="text-muted-foreground">組織の区画を管理します</p>
        </div>

        <Button onClick={() => actions.openCreate()}>
          <Plus className="mr-2 h-4 w-4" />
          区画を追加
        </Button>
      </div>

      {/* 区画一覧 */}
      {things && things.length > 0 ? (
        // TODO センサー設定が追加されたらアコーディオンで実装
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 w-full gap-2">
          {things.map((thing) => (
            <ThingAccordionItem
              key={thing.id}
              thing={thing}
              onEdit={() => actions.openEdit(thing.id)}
              onDelete={(id) => setDeletingThingId(id)}
            />
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="text-muted-foreground text-center">
            <p className="text-lg">まだ区画が登録されていません</p>
            <p className="text-sm">
              「区画を追加」ボタンから最初の区画を作成しましょう
            </p>
          </div>
          <Button onClick={() => actions.openCreate()}>
            <Plus className="mr-2 h-4 w-4" />
            最初の区画を追加
          </Button>
        </div>
      )}

      {/* 削除確認ダイアログ */}
      <DeleteThingDialog
        thingId={deletingThingId}
        organizationId={currentOrganizationId}
        onClose={() => setDeletingThingId(null)}
      />
    </div>
  );
}
