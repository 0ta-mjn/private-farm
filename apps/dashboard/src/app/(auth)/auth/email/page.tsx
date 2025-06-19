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
import { supabase } from "@/lib/supabase";

export default function AuthEmailPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  const onSuccess = useCallback(async () => {
    setStatus("success");
    setMessage("");
  }, []);

  useEffect(() => {
    if (!email) return;
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        if (session?.user.email == email) {
          // 成功時の処理
          onSuccess();
        } else {
          // 認証に失敗した場合
          setStatus("error");
          setMessage("認証に失敗しました。もう一度お試しください。");
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [email, onSuccess, router]);

  useEffect(() => {
    if (!email) return;

    const handler = async () => {
      // ページがロードされたときにSupabaseのセッションを確認
      const session = await supabase.auth.getSession();
      if (session.data.session?.user.email == email) {
        onSuccess();
      }
    };
    handler();
  }, [email, onSuccess]);

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
