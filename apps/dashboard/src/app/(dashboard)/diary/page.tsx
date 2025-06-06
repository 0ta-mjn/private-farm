"use client";

import { useDiaryDrawerActions } from "@/contexts/diary-drawer-context";
import { Button } from "@/shadcn/button";
import { PlusIcon } from "lucide-react";

export default function DiaryPage() {
  const actions = useDiaryDrawerActions();

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">農業日誌</h1>
          <p className="text-muted-foreground">農作業の記録を管理します</p>
        </div>

        <Button onClick={actions.openCreate}>
          <PlusIcon className="h-4 w-4 mr-2" />
          新規作成
        </Button>
      </div>

      {/* メインコンテンツエリア（一覧表示等） */}
      <div className="space-y-4">
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          日誌一覧がここに表示されます
          <br />
          「新規作成」ボタンから日誌を作成してみてください
        </div>
      </div>
    </div>
  );
}
