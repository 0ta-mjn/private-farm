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

interface DeleteOrganizationDialogProps {
  organizationId: string | null;
  organizationName?: string;
  onClose: () => void;
}

export function DeleteOrganizationDialog({
  organizationId,
  organizationName,
  onClose,
}: DeleteOrganizationDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // 削除mutation
  const deleteMutation = useMutation(
    trpc.organization.delete.mutationOptions({
      onSuccess: () => {
        toast.success("組織を削除しました", {
          description: `「${organizationName}」を削除しました。`,
        });
        // 関連するキャッシュを無効化
        queryClient.invalidateQueries({
          queryKey: trpc.user.setupCheck.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.organization.list.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.user.sidebarData.queryKey(),
        });
        // ダイアログを閉じる
        onClose();
      },
      onError: (error) => {
        console.error("Failed to delete organization:", error);
        const errorMessage = error?.message || "組織の削除に失敗しました";
        toast.error("組織の削除に失敗しました", {
          description: errorMessage,
        });
        // エラー時もダイアログを閉じる
        onClose();
      },
    })
  );

  const handleConfirmDelete = () => {
    if (!organizationId) return;

    // tRPC削除mutationを実行
    deleteMutation.mutate({
      organizationId,
    });
  };

  return (
    <AlertDialog
      open={!!organizationId}
      onOpenChange={(open) => !open && onClose()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>組織を削除</AlertDialogTitle>
          <AlertDialogDescription>
            {organizationName ? (
              <>
                「<strong>{organizationName}</strong>」を削除しますか？
                <br />
                この操作は取り消すことができません。組織に関連するすべてのデータが削除されます。
              </>
            ) : (
              "この組織を削除しますか？この操作は取り消すことができません。組織に関連するすべてのデータが削除されます。"
            )}
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
