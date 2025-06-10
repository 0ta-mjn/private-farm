"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { useOrganization } from "@/contexts/organization-context";
import { Button } from "@/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shadcn/card";
import { getThingTypeDisplay } from "@/constants/agricultural-constants";
import { useThingDrawerActions } from "@/contexts/thing-drawer-context";

export default function FieldsPage() {
  const trpc = useTRPC();
  const { currentOrganizationId } = useOrganization();

  const actions = useThingDrawerActions();

  // 区画一覧の取得
  const { data: fields, isLoading: isLoadingFields } = useQuery(
    trpc.thing.list.queryOptions(
      { organizationId: currentOrganizationId || "" },
      {
        enabled: !!currentOrganizationId,
      }
    )
  );

  if (isLoadingFields) {
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
      {fields && fields.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {fields.map((field) => (
            <FieldCard key={field.id} field={field} />
          ))}
        </div>
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
            区画を追加
          </Button>
        </div>
      )}
    </div>
  );
}

// 区画カードコンポーネント
interface FieldCardProps {
  field: {
    id: string;
    name: string;
    type: string;
    description: string | null;
    location: string | null;
    area: number | null;
  };
}

function FieldCard({ field }: FieldCardProps) {
  const { openEdit } = useThingDrawerActions();
  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => openEdit(field.id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{field.name}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {field.location || field.area ? (
          <div className="flex items-center gap-2">
            <span className="flex-1 rounded-full text-xs font-medium">
              {getThingTypeDisplay(field.type)?.label}
            </span>

            {field.location && (
              <div className="text-sm text-muted-foreground">
                📍 {field.location}
              </div>
            )}
            {field.area && (
              <div className="text-sm text-muted-foreground">
                📏 {field.area}㎡
              </div>
            )}
          </div>
        ) : null}

        {field.description && (
          <div className="text-sm text-muted-foreground">
            {field.description}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
