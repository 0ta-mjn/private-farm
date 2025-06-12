"use client";

import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
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

interface DeleteThingDialogProps {
  thingId: string | null;
  organizationId: string;
  onClose: () => void;
}

export function DeleteThingDialog({
  thingId,
  organizationId,
  onClose,
}: DeleteThingDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // 削除mutation - instructions.mdの推奨パターンを使用
  const deleteMutation = useMutation(
    trpc.thing.delete.mutationOptions({
      onSuccess: () => {
        toast.success("区画を削除しました");
        // カレンダー用のキャッシュを無効化
        queryClient.invalidateQueries({
          queryKey: trpc.thing.list.queryKey(),
        });
        // ダイアログを閉じる
        onClose();
      },
      onError: (error) => {
        console.error("Failed to delete thing:", error);
        toast.error("区画の削除に失敗しました");
        // エラー時もダイアログを閉じる
        onClose();
      },
    })
  );

  const handleConfirmDelete = () => {
    if (!thingId) return;

    // tRPC削除mutationを実行
    deleteMutation.mutate({
      thingId,
      organizationId,
    });
  };
  return (
    <AlertDialog open={!!thingId} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>区画を削除</AlertDialogTitle>
          <AlertDialogDescription>
            この区画を削除しますか？この操作は取り消すことができません。
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
