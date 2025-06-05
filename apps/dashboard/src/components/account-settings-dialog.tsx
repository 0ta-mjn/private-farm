"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shadcn/dialog";
import { Button } from "@/shadcn/button";
import { Input } from "@/shadcn/input";
import { Label } from "@/shadcn/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { UserIcon } from "lucide-react";

interface AccountSettingsDialogProps {
  children: React.ReactNode;
}

export function AccountSettingsDialog({
  children,
}: AccountSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // ユーザー情報を取得
  const { data: userData, isLoading } = useQuery(
    trpc.user.sidebarData.queryOptions()
  );

  // 名前更新の初期化
  React.useEffect(() => {
    if (userData?.user?.name) {
      setName(userData.user.name);
    }
  }, [userData?.user?.name]);

  // プロフィール更新のミューテーション
  const updateProfileMutation = useMutation(
    trpc.user.updateProfile.mutationOptions({
      onSuccess: () => {
        // キャッシュを更新
        queryClient.invalidateQueries({
          queryKey: trpc.user.sidebarData.queryKey(),
        });
        setOpen(false);
      },
      onError: (error) => {
        console.error("プロフィール更新エラー:", error);
      },
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    updateProfileMutation.mutate({ name: name.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            アカウント設定
          </DialogTitle>
          <DialogDescription>アカウント情報を編集できます。</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">ユーザー名</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ユーザー名を入力"
              disabled={isLoading || updateProfileMutation.isPending}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={updateProfileMutation.isPending}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={
                !name.trim() ||
                name === userData?.user?.name ||
                isLoading ||
                updateProfileMutation.isPending
              }
            >
              {updateProfileMutation.isPending ? "更新中..." : "更新"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
