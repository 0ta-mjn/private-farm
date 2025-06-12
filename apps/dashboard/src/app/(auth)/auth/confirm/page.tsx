"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shadcn/card";
import { Button } from "@/shadcn/button";
import { CheckCircleIcon, AlertCircleIcon, Loader2Icon } from "lucide-react";
import { supabase } from "@/lib/supabase";

const maxRetries = 3;
const baseDelay = 500;

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handleAuthCallback = async () => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // URLからハッシュパラメータを取得
          const hashParams = new URLSearchParams(
            window.location.hash.substring(1)
          );
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");

          if (accessToken && refreshToken) {
            // セッションを設定
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              throw error;
            }

            if (data.user) {
              setStatus("success");
              setMessage("アカウントの確認が完了しました。");
              router.push("/setup");
              return; // 成功時は関数を終了
            }
          } else {
            throw new Error("認証情報が見つかりません");
          }
        } catch (error) {
          console.error(`Auth callback error:`, error);

          // 最後の試行でない場合は、指数バックオフで待機
          if (attempt < maxRetries) {
            const delay = baseDelay * Math.pow(2, attempt - 1); // 1秒、2秒、4秒
            console.log(`Retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          } else {
            // 最後の試行も失敗した場合
            setStatus("error");
            setMessage(
              error instanceof Error
                ? error.message
                : "認証に失敗しました。もう一度お試しください。"
            );
          }
        }
      }
    };

    handleAuthCallback();
  }, [router]);

  const handleRetry = () => {
    router.push("/signup");
  };

  const handleGoToLogin = () => {
    router.push("/login");
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4">
          {status === "loading" && (
            <div className="bg-blue-100">
              <Loader2Icon className="h-6 w-6 text-blue-600 animate-spin" />
            </div>
          )}
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
          {status === "loading" && "認証を確認中..."}
          {status === "success" && "認証完了"}
          {status === "error" && "認証エラー"}
        </CardTitle>

        <CardDescription>
          {status === "loading" &&
            "アカウントの確認を行っています。しばらくお待ちください。"}
          {status === "success" && "初期設定画面に移動します..."}
          {status === "error" && message}
        </CardDescription>
      </CardHeader>

      {status !== "loading" && (
        <CardContent className="space-y-3">
          {status === "success" && (
            <Button onClick={() => router.push("/setup")} className="w-full">
              初期設定に進む
            </Button>
          )}

          {status === "error" && (
            <>
              <Button onClick={handleRetry} className="w-full">
                サインアップをやり直す
              </Button>
              <Button
                onClick={handleGoToLogin}
                variant="outline"
                className="w-full"
              >
                ログイン画面に戻る
              </Button>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
