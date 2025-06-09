"use client";

import React, { useState, useMemo, Suspense } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { useUserId } from "@/lib/auth-context";
import { useOrganization } from "@/contexts/organization-context";
import { useDiaryDrawerActions } from "@/contexts/diary-drawer-context";
import { Button } from "@/shadcn/button";
import { PlusIcon, SearchIcon } from "lucide-react";
import { Input } from "@/shadcn/input";
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
import { DiaryListView } from "@/components/diary/diary-list-view";
import { SimplePagination } from "@/components/diary/simple-pagination";
import { toast } from "sonner";

function DiaryPageContent() {
  const actions = useDiaryDrawerActions();
  const trpc = useTRPC();
  const userId = useUserId();
  const { currentOrganizationId } = useOrganization();
  const queryClient = useQueryClient();

  // 状態管理
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingDiaryId, setDeletingDiaryId] = useState<string | null>(null);

  const pageSize = 20; // フェーズ1の仕様に合わせて20件

  // offset を計算
  const offset = (currentPage - 1) * pageSize;

  // 削除mutation - instructions.mdの推奨パターンを使用
  const deleteMutation = useMutation(
    trpc.diary.delete.mutationOptions({
      onSuccess: (_, variables) => {
        toast.success("日誌を削除しました");
        // 検索用のキャッシュを更新
        queryClient.invalidateQueries({
          queryKey: trpc.diary.search.queryKey({
            organizationId: variables.organizationId,
            offset,
            limit: pageSize,
            search: searchQuery || undefined,
          }),
        });
        // カレンダー用のキャッシュも無効化
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

  // 日誌一覧の取得 - 新しい検索エンドポイントを使用
  const diariesQueryOptions = trpc.diary.search.queryOptions(
    {
      organizationId: currentOrganizationId || "",
      offset,
      limit: pageSize,
      search: searchQuery || undefined,
    },
    {
      enabled: !!currentOrganizationId,
      staleTime: 5 * 60 * 1000, // 5分間キャッシュ
    }
  );

  const diariesQuery = useQuery(diariesQueryOptions);

  // データの加工
  const diaries = useMemo(() => {
    return diariesQuery.data?.diaries || [];
  }, [diariesQuery.data]);

  const totalPages = useMemo(() => {
    if (!diariesQuery.data?.total) return 1;
    return Math.ceil(diariesQuery.data.total / pageSize);
  }, [diariesQuery.data?.total, pageSize]);

  // イベントハンドラー
  const handleDiaryClick = (diaryId: string) => {
    // TODO: 詳細ダイアログを開く実装
    console.log("Open diary detail:", diaryId);
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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // 検索時はページを1に戻す
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
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative max-w-md">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="日誌を検索..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Button onClick={actions.openCreate}>
            <PlusIcon className="h-4 w-4 mr-2" />
            新規作成
          </Button>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="space-y-6">
        {diariesQuery.isLoading ? (
          <div className="text-center py-12">
            <div className="text-muted-foreground">読み込み中...</div>
          </div>
        ) : diariesQuery.error ? (
          <div className="text-center py-12">
            <div className="text-destructive">データの取得に失敗しました</div>
          </div>
        ) : searchQuery ? (
          <>
            <DiaryListView
              diaries={diaries}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onCardClick={handleDiaryClick}
              currentUserId={userId}
              loading={diariesQuery.isLoading}
            />

            {/* ページネーション（一覧表示時のみ） */}
            <SimplePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              hasNextPage={currentPage < totalPages}
              hasPrevPage={currentPage > 1}
            />
          </>
        ) : (
          <DiaryCalendarView
            organizationId={currentOrganizationId}
            onEdit={handleEdit}
            onDelete={handleDelete}
            currentUserId={userId}
          />
        )}
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
