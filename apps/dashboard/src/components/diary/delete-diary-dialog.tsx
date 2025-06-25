"use client";

import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { client } from "@/rpc/client";
import { diaries } from "@/rpc/factory";

interface DeleteDiaryDialogProps {
  diaryId: string | null;
  organizationId: string;
  onClose: () => void;
}

export function DeleteDiaryDialog({
  diaryId,
  organizationId,
  onClose,
}: DeleteDiaryDialogProps) {
  const queryClient = useQueryClient();

  // 削除mutation - Honoクライアントを使用
  const deleteMutation = useMutation({
    mutationFn: async ({
      diaryId,
      organizationId,
    }: {
      diaryId: string;
      organizationId: string;
    }) =>
      client.diary.delete[":organizationId"][":diaryId"].$delete({
        param: { diaryId, organizationId },
      }),
    onSuccess: () => {
      toast.success("日誌を削除しました");
      // カレンダー用のキャッシュを無効化
      queryClient.invalidateQueries({
        queryKey: diaries.byMonth._def,
      });
      queryClient.invalidateQueries({
        queryKey: diaries.byDate._def,
      });
      // ダイアログを閉じる
      onClose();
    },
    onError: (error) => {
      console.error("Failed to delete diary:", error);
      toast.error("日誌の削除に失敗しました");
      // エラー時もダイアログを閉じる
      onClose();
    },
  });

  const handleConfirmDelete = () => {
    if (!diaryId) return;

    // Hono削除mutationを実行
    deleteMutation.mutate({
      diaryId,
      organizationId,
    });
  };
  return (
    <AlertDialog open={!!diaryId} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>日誌を削除</AlertDialogTitle>
          <AlertDialogDescription>
            この日誌を削除しますか？この操作は取り消すことができません。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            キャンセル
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "削除中..." : "削除する"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
