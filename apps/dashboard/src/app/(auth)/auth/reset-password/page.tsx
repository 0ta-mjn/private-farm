"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shadcn/card";
import { Button } from "@/shadcn/button";
import { Input } from "@/shadcn/input";
import { Alert, AlertDescription } from "@/shadcn/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shadcn/form";
import {
  CheckCircleIcon,
  AlertCircleIcon,
  Loader2Icon,
  EyeIcon,
  EyeOffIcon,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// フォームバリデーションスキーマ
const formSchema = z
  .object({
    password: z
      .string()
      .min(8, "パスワードは8文字以上で入力してください")
      .regex(
        /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "パスワードは大文字、小文字、数字を含む必要があります"
      ),
    confirmPassword: z.string().min(1, "パスワード確認を入力してください"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "パスワードが一致しません",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof formSchema>;

export default function AuthResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<
    "loading" | "form" | "success" | "error"
  >("loading");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const params = useSearchParams();
  useEffect(() => {
    const code = params.get("code");
    if (!code) {
      setStatus("error");
      setGeneralError("認証コードが見つかりません。もう一度お試しください。");
      return;
    }

    // 認証コードを使ってサインイン
    const handler = async () => {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (data?.user) {
        // 成功時の処理
        setStatus("form");
      } else {
        // 認証に失敗した場合
        setStatus("error");
        switch (error?.code) {
          case "auth/invalid-credentials":
            setGeneralError("無効な認証情報です。もう一度お試しください。");
            break;
          case "auth/session-expired":
            setGeneralError(
              "セッションが期限切れです。再度ログインしてください。"
            );
            break;
          default:
            setGeneralError("認証に失敗しました。もう一度お試しください。");
        }
      }
    };

    handler().catch((error) => {
      console.error("認証処理中にエラー:", error);
      setStatus("error");
      setGeneralError(
        "認証処理中にエラーが発生しました。もう一度お試しください。"
      );
    });
  }, [params, router]);

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    setGeneralError(null);

    try {
      // パスワードを更新
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (error) {
        // エラーコードによる分岐処理
        switch (error.code) {
          case "weak_password":
            setGeneralError(
              "パスワードが脆弱です。より強力なパスワードを設定してください。"
            );
            break;
          case "session_not_found":
            setGeneralError(
              "セッションが見つかりません。リンクの有効期限が切れている可能性があります。"
            );
            break;
          case "same_password":
            setGeneralError(
              "新しいパスワードは現在のパスワードと同じです。異なるパスワードを設定してください。"
            );
            break;
          default:
            setGeneralError(
              error.message || "パスワード更新中にエラーが発生しました"
            );
            break;
        }
        return;
      }

      // 3秒後にログイン画面に遷移
      router.push("/login");
    } catch (err) {
      console.error("Password update error:", err);
      setGeneralError("パスワード更新中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  // ローディング画面
  if (status === "loading") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            <Loader2Icon className="h-6 w-6 text-blue-600 animate-spin" />
          </div>
          <CardTitle className="text-2xl">認証を確認中...</CardTitle>
          <CardDescription>
            パスワードリセットの認証を確認しています。しばらくお待ちください。
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // 成功画面
  if (status === "success") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <CheckCircleIcon className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl">パスワード更新完了</CardTitle>
          <CardDescription>
            新しいパスワードが設定されました。ログイン画面に移動します...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login">
            <Button className="w-full">ログイン画面に進む</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // エラー画面またはリンク期限切れ画面
  if (status === "error") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <AlertCircleIcon className="h-6 w-6 text-red-600" />
          </div>
          <CardDescription>
            {generalError || "パスワードリセット中にエラーが発生しました"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link href="/reset-password">
            <Button className="w-full">新しいリセットリンクを要求</Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" className="w-full">
              ログイン画面に戻る
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // パスワード設定フォーム
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">新しいパスワードを設定</CardTitle>
        <CardDescription>
          アカウントの新しいパスワードを入力してください。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* 新しいパスワード */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>新しいパスワード</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="新しいパスワードを入力"
                        className="pr-10"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? (
                          <EyeOffIcon className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <EyeIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <p className="text-sm text-muted-foreground">
                    8文字以上、大文字・小文字・数字を含む必要があります
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* パスワード確認 */}
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>パスワード確認</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="パスワードを再入力"
                        className="pr-10"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showConfirmPassword ? (
                          <EyeOffIcon className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <EyeIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* エラーメッセージ */}
            {generalError && (
              <Alert variant="destructive">
                <AlertCircleIcon className="h-4 w-4" />
                <AlertDescription>{generalError}</AlertDescription>
              </Alert>
            )}

            {/* 送信ボタン */}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "更新中..." : "パスワードを更新"}
            </Button>
          </form>
        </Form>

        {/* キャンセルリンク */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            キャンセルして{" "}
            <Link href="/login">
              <Button variant="link" className="p-0 h-auto hover:underline">
                ログイン画面に戻る
              </Button>
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
