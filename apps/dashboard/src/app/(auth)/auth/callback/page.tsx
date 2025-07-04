"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shadcn/card";
import { Button } from "@/shadcn/button";
import { AlertCircleIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { client } from "@/rpc/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");

  const onSuccess = useCallback(async () => {
    try {
      setStatus("success");
      setMessage("");
      // 初期設定状態を確認
      const setupStatus = await client.user.setup.$get();

      if (setupStatus.isCompleted) {
        // 初期設定完了済みの場合はダッシュボードへ
        router.push("/dashboard");
      } else {
        // 初期設定未完了の場合はセットアップページへ
        router.push("/setup");
      }
    } catch (error) {
      console.error("初期設定状態の確認に失敗:", error);
      setStatus("error");
      setMessage("初期設定状態の確認に失敗しました。もう一度お試しください。");
    }
  }, [router]);

  const params = useSearchParams();
  useEffect(() => {
    const code = params.get("code");
    if (!code) {
      setStatus("error");
      setMessage("認証コードが見つかりません。もう一度お試しください。");
      return;
    }

    // 認証コードを使ってサインイン
    const handler = async () => {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (data?.user) {
        // 成功時の処理
        onSuccess();
      } else {
        // 認証に失敗した場合
        setStatus("error");
        switch (error?.code) {
          case "auth/invalid-credentials":
            setMessage("無効な認証情報です。もう一度お試しください。");
            break;
          case "auth/session-expired":
            setMessage("セッションが期限切れです。再度ログインしてください。");
            break;
          default:
            setMessage("認証に失敗しました。もう一度お試しください。");
        }
      }
    };

    handler().catch((error) => {
      console.error("認証処理中にエラー:", error);
      setStatus("error");
      setMessage("認証処理中にエラーが発生しました。もう一度お試しください。");
    });
  }, [onSuccess, router, params]);

  useEffect(() => {
    const handler = async () => {
      // ページがロードされたときにSupabaseのセッションを確認
      const session = await supabase.auth.getSession();
      if (session.data.session?.user) {
        onSuccess();
      }
    };
    handler();
  }, [onSuccess]);

  const handleRetry = () => {
    router.push("/login");
  };

  const handleGoToLogin = () => {
    router.push("/login");
  };

  if (status == "success" || status == "loading") return null; // 成功時は何も表示しない

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4">
          {status === "error" && (
            <div className="bg-red-100">
              <AlertCircleIcon className="h-6 w-6 text-red-600" />
            </div>
          )}
        </div>

        <CardTitle className="text-2xl">
          {status === "error" && "認証エラー"}
        </CardTitle>

        <CardDescription>{status === "error" && message}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <Button onClick={handleRetry} className="w-full">
          ログインをやり直す
        </Button>
        <Button onClick={handleGoToLogin} variant="outline" className="w-full">
          ログイン画面に戻る
        </Button>
      </CardContent>
    </Card>
  );
}
