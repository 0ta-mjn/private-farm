"use client";

import { Button } from "@/shadcn/button";
import { Trash2Icon } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { client } from "@/rpc/client";
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
import { AlertTriangleIcon } from "lucide-react";
import { useState } from "react";
import { useAuthActions } from "@/lib/auth-context";

export function AccountDeleteRow() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => client.user.account.$delete(),
    onSuccess: () => {
      router.push("/login");
      signOut();
    },
    onError: (error) => {
      console.error("アカウント削除エラー:", error);
    },
  });

  return (
    <div className="flex items-center justify-end gap-3">
      <div className="sm:block hidden space-y-1 flex-1">
        <p className="text-sm text-destructive">アカウントの削除</p>
        <p className="text-sm text-muted-foreground">
          アカウント削除すると、すべてのデータが失われます。
          <br />
          この操作は取り消すことができません。
        </p>
      </div>

      <Button
        variant="destructive"
        size="sm"
        onClick={() => setOpen(true)}
        className="w-full sm:w-fit"
      >
        <Trash2Icon className="h-4 w-4 mr-2" />
        アカウントを削除
      </Button>

      <AlertDialog
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) {
            mutation.reset();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-4">
              <AlertTriangleIcon className="h-5 w-5 text-destructive" />
              アカウントの削除
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>本当にアカウントを削除しますか？</p>
                <p className="text-sm text-muted-foreground">
                  この操作により、以下のデータがすべて削除されます：
                </p>
                <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                  <li>ユーザープロフィール情報</li>
                  <li>作成した組織（他のメンバーがいない場合）</li>
                  <li>農業日誌データ</li>
                  <li>その他すべての関連データ</li>
                </ul>
                <p className="text-sm font-medium text-destructive">
                  この操作は取り消すことができません。
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                mutation.mutate();
              }}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
