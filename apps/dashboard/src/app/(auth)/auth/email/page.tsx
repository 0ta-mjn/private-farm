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
import { AlertCircleIcon, CheckCircleIcon } from "lucide-react";
import { client } from "@/rpc/client";
import { auth } from "@/lib/auth-provider";
import { AuthError } from "@repo/auth-client";

export default function AuthEmailPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

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
      try {
        const data = await auth.verifyCode({
          type: "verify-email",
          code,
        });

        if (data?.user) {
          onSuccess();
        }
      } catch (error) {
        console.error("認証処理中にエラー:", error);
        // 認証に失敗した場合
        setStatus("error");
        if (error instanceof AuthError) {
          switch (error?.code) {
            case "invalid_credentials":
            case "invalid_token":
            case "invalid_request":
              setMessage("無効な認証情報です。もう一度お試しください。");
              break;
            case "token_expired":
              setMessage(
                "セッションが期限切れです。再度ログインしてください。"
              );
              break;
            default:
              setMessage("認証に失敗しました。もう一度お試しください。");
          }
        } else {
          setMessage("認証に失敗しました。もう一度お試しください。");
        }
      }
    };

    handler().catch((error) => {
      console.error("認証処理中にエラー:", error);
      setStatus("error");
      setMessage("認証処理中にエラーが発生しました。もう一度お試しください。");
    });
  }, [email, onSuccess, params, router]);

  const handleGoToDashboard = () => {
    router.push("/dashboard");
  };

  if (status == "loading") return null; // 成功時は何も表示しない

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4">
          {status === "success" && (
            <div className="bg-green-100">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
          )}

          {status === "error" && (
            <div className="bg-red-100">
              <AlertCircleIcon className="h-6 w-6 text-red-600" />
            </div>
          )}
        </div>

        <CardTitle className="text-2xl">
          {status === "success" && "認証成功"}
          {status === "error" && "認証エラー"}
        </CardTitle>

        <CardDescription>{status === "error" && message}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {status === "success" && (
          <p className="text-center text-green-600">
            メールアドレスを変更しました。
          </p>
        )}
        <Button
          onClick={handleGoToDashboard}
          variant="outline"
          className="w-full"
        >
          ダッシュボードに戻る
        </Button>
      </CardContent>
    </Card>
  );
}
