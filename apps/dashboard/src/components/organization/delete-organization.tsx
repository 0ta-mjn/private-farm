"use client";

import { useState } from "react";
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
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/shadcn/card";
import { TrashIcon, ShieldIcon } from "lucide-react";
import { Button } from "@/shadcn/button";

interface DeleteOrganizationProps {
  organizationId: string | null;
  organizationName?: string;
}

export function DeleteOrganization({
  organizationId,
  organizationName,
}: DeleteOrganizationProps) {
  const [open, setOpen] = useState(false);
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
        setOpen(false);
      },
      onError: (error) => {
        console.error("Failed to delete organization:", error);
        const errorMessage = error?.message || "組織の削除に失敗しました";
        toast.error("組織の削除に失敗しました", {
          description: errorMessage,
        });
        // エラー時もダイアログを閉じる
        setOpen(false);
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
    <>
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <TrashIcon className="h-5 w-5" />
            危険ゾーン
          </CardTitle>
          <CardDescription>
            組織を削除すると、すべてのデータが永久に失われます。この操作は取り消すことができません。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
              <div className="flex items-start gap-3">
                <ShieldIcon className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="font-medium text-destructive">
                    組織の削除について
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• 組織に関連するすべてのデータが削除されます</li>
                    <li>• 区画、活動記録、メンバーの情報がすべて失われます</li>
                    <li>• この操作は取り消すことができません</li>
                    <li>• 削除後はアクセスできなくなります</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="destructive" onClick={() => setOpen(true)}>
                <TrashIcon className="h-4 w-4 mr-2" />
                組織を削除
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 削除確認ダイヤログ */}
      <AlertDialog open={open} onOpenChange={setOpen}>
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
    </>
  );
}
