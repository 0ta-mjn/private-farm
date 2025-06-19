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
import { AlertCircleIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AuthConfirmPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user.confirmed_at) {
        // 成功時の処理
        setStatus("success");
        setMessage("アカウントの確認が完了しました。");
        router.push("/setup");
      } else {
        // 認証に失敗した場合
        setStatus("error");
        setMessage("認証に失敗しました。もう一度お試しください。");
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [router]);

  const handleRetry = () => {
    router.push("/signup");
  };

  const handleGoToLogin = () => {
    router.push("/login");
  };

  if (status === "success" || status == "loading") return null; // 成功時は何も表示しない

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4">
          <div className="bg-red-100">
            <AlertCircleIcon className="h-6 w-6 text-red-600" />
          </div>
        </div>

        <CardTitle className="text-2xl">
          {status === "error" && "認証エラー"}
        </CardTitle>

        <CardDescription>{status === "error" && message}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <Button onClick={handleRetry} className="w-full">
          サインアップをやり直す
        </Button>
        <Button onClick={handleGoToLogin} variant="outline" className="w-full">
          ログイン画面に戻る
        </Button>
      </CardContent>
    </Card>
  );
}
