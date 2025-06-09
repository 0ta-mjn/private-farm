"use client";

import React, { useState, Suspense } from "react";
import { useUserId } from "@/lib/auth-context";
import { useOrganization } from "@/contexts/organization-context";
import { useDiaryDrawerActions } from "@/contexts/diary-drawer-context";
import { Button } from "@/shadcn/button";
import { PlusIcon } from "lucide-react";
import { DiaryCalendarView } from "@/components/diary/diary-calendar-view";
import { DiarySearch } from "@/components/diary/diary-search";
import { DeleteDiaryDialog } from "@/components/diary/delete-diary-dialog";
import { useRouter, useSearchParams } from "next/navigation";

function DiaryPageContent() {
  const actions = useDiaryDrawerActions();
  const userId = useUserId();
  const { currentOrganizationId } = useOrganization();

  // 状態管理
  const [deletingDiaryId, setDeletingDiaryId] = useState<string | null>(null);

  // イベントハンドラー
  const router = useRouter();
  const searchParams = useSearchParams();
  const handleDiaryClick = (diary: { date: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", diary.date);
    params.set("month", diary.date.slice(0, 7)); // yyyy-MM形式に変換
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleEdit = (diaryId: string) => {
    actions.openEdit(diaryId);
  };

  const handleDelete = (diaryId: string) => {
    setDeletingDiaryId(diaryId);
  };

  if (!userId) return null; // ユーザーが未ログインの場合は何も表示しない

  // 組織が選択されていない場合の表示
  if (!currentOrganizationId) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">組織を選択してください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      {/* ヘッダー */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex justify-between items-start">
          <DiarySearch
            onDiarySelect={handleDiaryClick}
            currentUserId={userId}
          />

          <Button onClick={actions.openCreate}>
            <PlusIcon className="h-4 w-4 mr-2" />
            新規作成
          </Button>
        </div>
      </div>

      {/* メインコンテンツ - カレンダー表示 */}
      <div className="space-y-6">
        <DiaryCalendarView
          organizationId={currentOrganizationId}
          onEdit={handleEdit}
          onDelete={handleDelete}
          currentUserId={userId}
        />
      </div>

      {/* 削除確認ダイアログ */}
      <DeleteDiaryDialog
        diaryId={deletingDiaryId}
        organizationId={currentOrganizationId || ""}
        onClose={() => setDeletingDiaryId(null)}
      />
    </div>
  );
}

export default function DiaryPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DiaryPageContent />
    </Suspense>
  );
}
