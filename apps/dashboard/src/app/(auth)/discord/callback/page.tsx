"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/shadcn/card";
import { Button } from "@/shadcn/button";
import { XCircleIcon } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

interface DiscordOAuthData {
  state: string;
  timestamp: number;
}

export default function DiscordCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string>("");

  const trpc = useTRPC();

  // tRPC mutationOptionsを使用
  const discordLinkMutation = useMutation(
    trpc.discord.linkChannel.mutationOptions({
      onSuccess: () => {
        setStatus("success");
        toast.success("Discordの連携が完了しました");
        // 成功時も念のためOAuth情報をクリーンアップ
        localStorage.removeItem("discord_oauth_data");
        // 成功時は組織設定ページに即座にリダイレクト
        router.replace("/organization/settings");
      },
      onError: (error) => {
        console.error("Discord link mutation error:", error);
        setStatus("error");
        setErrorMessage(error.message || "不明なエラーが発生しました");
        toast.error(
          "Discord連携に失敗しました: " + (error.message || "不明なエラー")
        );
        // エラー時もOAuth情報をクリーンアップ
        localStorage.removeItem("discord_oauth_data");
      },
    })
  );

  useEffect(() => {
    // デバウンス: 既に処理中の場合は実行しない
    if (discordLinkMutation.isPending || discordLinkMutation.isSuccess) {
      return;
    }

    const processOAuth = async () => {
      const handleError = (message: string, shouldCleanup: boolean = true) => {
        setStatus("error");
        setErrorMessage(message);
        if (shouldCleanup) {
          localStorage.removeItem("discord_oauth_data");
        }
      };

      try {
        const code = searchParams.get("code");
        const guildId = searchParams.get("guild_id");
        const state = searchParams.get("state");
        const error = searchParams.get("error");

        if (error) {
          throw new Error("ユーザーによってキャンセルされました");
        }

        if (!code || !state || !guildId) {
          throw new Error("必要なパラメータが不足しています");
        }

        // ローカルストレージからOAuth情報を取得（CSRF対策）
        const storedOAuthData = localStorage.getItem("discord_oauth_data");
        if (!storedOAuthData) {
          throw new Error("セキュリティエラー: 認証情報が見つかりません");
        }

        let oauthData: DiscordOAuthData;
        try {
          oauthData = JSON.parse(storedOAuthData);
        } catch (parseError) {
          console.error("OAuth data parse error:", parseError);
          throw new Error("セキュリティエラー: 認証情報が無効です");
        }

        // state検証
        if (!oauthData.state || oauthData.state !== state) {
          throw new Error("セキュリティエラー: 無効なリクエストです");
        }

        // タイムスタンプ検証（10分以内）
        if (
          !oauthData.timestamp ||
          Date.now() - oauthData.timestamp > 10 * 60 * 1000
        ) {
          throw new Error("認証リクエストの有効期限が切れています");
        }

        // stateからorganizationIdを抽出
        const [organizationId, nonce] = state.split(":");
        if (!organizationId || !nonce) {
          throw new Error("無効なstateパラメータです");
        }

        // Discord連携処理を実行
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL!;

        discordLinkMutation.mutate({
          code,
          guildId,
          organizationId,
          state,
          redirectUri: `${baseUrl}/discord/callback`,
        });

        // 使用済みOAuth情報を削除
        localStorage.removeItem("discord_oauth_data");
      } catch (error) {
        console.error("OAuth processing error:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "予期しないエラーが発生しました";
        handleError(errorMessage);
      }
    };

    processOAuth();
  }, [searchParams, discordLinkMutation]);

  const handleRetry = () => {
    router.replace("/organization/settings");
  };

  if (status == "loading" || status == "success") return null;

  return (
    <div className="container mx-auto py-8 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === "error" && (
              <>
                <XCircleIcon className="h-5 w-5 text-red-500" />
                連携エラー
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "error" && (
            <div className="space-y-4">
              <p className="text-red-600">Discord連携に失敗しました。</p>
              {errorMessage && (
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                  エラー詳細: {errorMessage}
                </p>
              )}
              <Button onClick={handleRetry} className="w-full">
                組織設定に戻る
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
