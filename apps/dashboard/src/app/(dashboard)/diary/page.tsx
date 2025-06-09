"use client";

import React, { useState, Suspense } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { useUserId } from "@/lib/auth-context";
import { useOrganization } from "@/contexts/organization-context";
import { useDiaryDrawerActions } from "@/contexts/diary-drawer-context";
import { Button } from "@/shadcn/button";
import { PlusIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shadcn/alert-dialog";
import { DiaryCalendarView } from "@/components/diary/diary-calendar-view";
import { DiarySearch } from "@/components/diary/diary-search";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";

function DiaryPageContent() {
  const actions = useDiaryDrawerActions();
  const trpc = useTRPC();
  const userId = useUserId();
  const { currentOrganizationId } = useOrganization();
  const queryClient = useQueryClient();

  // 状態管理
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingDiaryId, setDeletingDiaryId] = useState<string | null>(null);

  // 削除mutation - instructions.mdの推奨パターンを使用
  const deleteMutation = useMutation(
    trpc.diary.delete.mutationOptions({
      onSuccess: () => {
        toast.success("日誌を削除しました");
        // カレンダー用のキャッシュを無効化
        queryClient.invalidateQueries({
          queryKey: trpc.diary.byMonth.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.diary.byDate.queryKey(),
        });
        // ステート更新
        setDeleteDialogOpen(false);
        setDeletingDiaryId(null);
      },
      onError: (error) => {
        console.error("Failed to delete diary:", error);
        toast.error("日誌の削除に失敗しました");
        // エラー時もダイアログを閉じる
        setDeleteDialogOpen(false);
        setDeletingDiaryId(null);
      },
    })
  );

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
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!deletingDiaryId) return;

    // tRPC削除mutationを実行
    deleteMutation.mutate({
      diaryId: deletingDiaryId,
      organizationId: currentOrganizationId || "",
    });
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
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>日誌を削除</AlertDialogTitle>
            <AlertDialogDescription>
              この日誌を削除しますか？この操作は取り消すことができません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
