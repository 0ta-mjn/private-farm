"use client";

import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/rpc/client";
import { things } from "@/rpc/factory";
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
  const queryClient = useQueryClient();

  // 削除mutation - Honoクライアント呼び出しに修正
  const deleteMutation = useMutation({
    mutationFn: async (params: { thingId: string; organizationId: string }) =>
      client.thing.delete[":organizationId"][":thingId"].$delete({
        param: {
          organizationId: params.organizationId,
          thingId: params.thingId,
        },
      }),
    onSuccess: () => {
      toast.success("区画を削除しました");
      // 区画リストのキャッシュを無効化
      queryClient.invalidateQueries({
        queryKey: things.list(organizationId).queryKey,
      });
      // ダイアログを閉じる
      onClose();
    },
    onError: (error: Error) => {
      console.error("Failed to delete thing:", error);
      toast.error("区画の削除に失敗しました");
      // エラー時もダイアログを閉じる
      onClose();
    },
  });

  const handleConfirmDelete = () => {
    if (!thingId) return;

    // 削除mutationを実行
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
