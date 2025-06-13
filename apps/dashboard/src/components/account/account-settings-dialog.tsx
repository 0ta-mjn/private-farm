"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
} from "@/shadcn/dialog";
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
import { Button } from "@/shadcn/button";
import { Input } from "@/shadcn/input";
import { Label } from "@/shadcn/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shadcn/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { UserIcon, Trash2Icon, AlertTriangleIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface AccountSettingsDialogProps {
  children: React.ReactNode;
}

export function AccountSettingsDialog({
  children,
}: AccountSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [activeTab, setActiveTab] = useState("profile");
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();

  // ユーザー情報を取得
  const { data: userData, isLoading } = useQuery(
    trpc.user.sidebarData.queryOptions()
  );

  // 名前更新の初期化
  useEffect(() => {
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

  // アカウント削除のミューテーション
  const deleteAccountMutation = useMutation(
    trpc.user.deleteAccount.mutationOptions({
      onSuccess: () => {
        // ダイヤログを閉じる
        setDeleteDialogOpen(false);
        setOpen(false);
        router.push("/login");
        supabase.auth.signOut();
      },
      onError: (error) => {
        console.error("アカウント削除エラー:", error);
      },
    })
  );

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    updateProfileMutation.mutate({ name: name.trim() });
  };

  const handleDeleteAccount = () => {
    deleteAccountMutation.mutate();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>アカウント設定</DialogTitle>
            <DialogDescription>
              アカウントのプロフィールや設定を管理します。
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex w-full gap-6 sm:flex-row"
          >
            <TabsList className="flex h-fit sm:flex-col">
              <TabsTrigger value="profile" className="w-full justify-start">
                <UserIcon className="h-4 w-4 mr-2" />
                プロフィール
              </TabsTrigger>
              <TabsTrigger value="account" className="w-full justify-start">
                <Trash2Icon className="h-4 w-4 mr-2" />
                アカウント
              </TabsTrigger>
            </TabsList>

            {/* 右側のコンテンツ */}
            <div className="flex-1">
              <TabsContent value="profile" className="space-y-4 mt-0">
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">ユーザー名</Label>
                    <Input
                      id="name"
                      name="name"
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
              </TabsContent>

              <TabsContent value="account" className="space-y-4 mt-0">
                <div className="flex items-center justify-end rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="text-sm text-destructive flex-1 sm:block hidden">
                    アカウントの削除
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={deleteAccountMutation.isPending}
                    className="w-full sm:w-fit"
                  >
                    <Trash2Icon className="h-4 w-4 mr-2" />
                    アカウントを削除
                  </Button>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* アカウント削除確認ダイヤログ */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-4">
              <AlertTriangleIcon className="h-5 w-5" />
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
            <AlertDialogCancel disabled={deleteAccountMutation.isPending}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteAccountMutation.isPending}
            >
              {deleteAccountMutation.isPending ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
