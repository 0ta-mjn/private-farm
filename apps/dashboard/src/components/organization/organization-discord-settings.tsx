"use client";

import React, { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shadcn/card";
import { Button } from "@/shadcn/button";
import { Skeleton } from "@/shadcn/skeleton";
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
  BellIcon,
  TrashIcon,
  LinkIcon,
  CheckCircleIcon,
  ServerIcon,
  CalendarIcon,
} from "lucide-react";
import { RouterOutputs } from "@repo/api";

interface OrganizationDiscordSettingsProps {
  organizationId: string;
}

type DiscordInstallation = RouterOutputs["discord"]["getInstallations"][number];

export function OrganizationDiscordSettings({
  organizationId,
}: OrganizationDiscordSettingsProps) {
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [selectedInstallationId, setSelectedInstallationId] = useState<
    string | null
  >(null);

  const trpc = useTRPC();

  // Discord連携情報を取得
  const {
    data: installations,
    refetch: refetchInstallations,
    isLoading: isLoadingInstallations,
  } = useQuery(trpc.discord.getInstallations.queryOptions({ organizationId }));

  // Discord OAuth URL取得
  const getOAuthUrlMutation = useMutation(
    trpc.discord.getOAuthUrl.mutationOptions({
      onSuccess: (data: { url: string; state: string }) => {
        // stateとタイムスタンプをJSONとして1つのキーに保存
        const oauthData = {
          state: data.state,
          timestamp: Date.now(),
        };
        localStorage.setItem("discord_oauth_data", JSON.stringify(oauthData));

        // 現在のタブでリダイレクト（モバイル対応）
        window.location.href = data.url;
      },
      onError: (error) => {
        toast.error("Discord連携URLの取得に失敗しました: " + error.message);
      },
    })
  );

  // Discord連携解除
  const unlinkMutation = useMutation(
    trpc.discord.unlink.mutationOptions({
      onSuccess: () => {
        toast.success("Discordの連携を解除しました");
        setUnlinkDialogOpen(false);
        setSelectedInstallationId(null);
        // 連携情報を再取得
        refetchInstallations();
      },
      onError: (error) => {
        toast.error("Discord連携解除に失敗しました: " + error.message);
      },
    })
  );

  const handleConnectDiscord = () => {
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL!}/discord/callback`;
    getOAuthUrlMutation.mutate({ organizationId, redirectUri });
  };

  const confirmUnlink = () => {
    if (!selectedInstallationId) return;

    unlinkMutation.mutate({
      organizationId,
      installationId: selectedInstallationId,
    });
  };

  // 選択された連携情報を取得
  const selectedInstallation = installations?.find(
    (installation) => installation.id === selectedInstallationId
  );

  if (isLoadingInstallations && !installations) {
    // スケルトン表示
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-40" />
          </div>
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            {/* Discord連携ボタンエリアのスケルトン */}
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-10 w-32 rounded-md" />
            </div>

            {/* 連携情報エリアのスケルトン */}
            <div className="rounded-lg border border-dashed border-muted-foreground/25 p-4">
              <div className="flex flex-col items-center gap-2 text-center">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-56" />
              </div>
            </div>

            {/* 機能説明エリアのスケルトン */}
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-5 w-5 rounded-full flex-shrink-0 mt-0.5" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-5/6" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellIcon className="h-5 w-5" />
            Discord通知設定
          </CardTitle>
          <CardDescription>
            Discord サーバーと連携して、重要な通知を受け取ることができます。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            {/* 既存の連携表示エリア */}
            {installations && installations.length > 0 ? (
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">
                  連携中のDiscordサーバー
                </h4>
                {installations.map((installation: DiscordInstallation) => (
                  <div
                    key={installation.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/25"
                  >
                    <div className="flex items-center gap-3">
                      <ServerIcon className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="font-medium text-sm">
                          {installation.guildName ||
                            `サーバー (${installation.guildId})`}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarIcon className="h-3 w-3" />
                          <span>
                            {new Date(
                              installation.installedAt
                            ).toLocaleDateString("ja-JP")}{" "}
                            に連携
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedInstallationId(installation.id);
                        setUnlinkDialogOpen(true);
                      }}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <TrashIcon className="h-4 w-4 mr-1" />
                      解除
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Discord連携</h4>
                  <p className="text-sm text-muted-foreground">
                    Discord サーバーでボットを有効にして通知を受信
                  </p>
                </div>
                <Button
                  onClick={handleConnectDiscord}
                  disabled={getOAuthUrlMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {getOAuthUrlMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                      設定中...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="h-4 w-4" />
                      Discord連携
                    </>
                  )}
                </Button>
              </div>
            )}

            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-medium text-sm">
                    Discord連携でできること
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• 重要なアラートや通知をリアルタイムで受信</li>
                    <li>• 作業記録やデータ更新の自動通知</li>
                    <li>• システムメンテナンス情報の配信</li>
                    <li>• 複数のチャンネルで異なる種類の通知を管理</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 連携解除確認ダイアログ */}
      <AlertDialog open={unlinkDialogOpen} onOpenChange={setUnlinkDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discord連携を解除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedInstallation && (
                <>
                  「
                  {selectedInstallation.guildName ||
                    `サーバー (${selectedInstallation.guildId})`}
                  」との連携を解除します。
                  <br />
                </>
              )}
              この操作により、このDiscordサーバーからの通知を受け取れなくなります。
              必要に応じて、再度連携設定を行うことができます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmUnlink}
              disabled={unlinkMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {unlinkMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                  解除中...
                </>
              ) : (
                <>
                  <TrashIcon className="h-4 w-4 mr-2" />
                  連携解除
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
