"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
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
    "loading" | "form" | "success" | "error" | "expired"
  >("loading");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // URLからハッシュパラメータを取得
        const hashParams = new URLSearchParams(
          window.location.hash.substring(1)
        );
        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");
        const type = hashParams.get("type");

        if (type === "recovery" && access_token && refresh_token) {
          // トークンを保存
          setAccessToken(access_token);
          setRefreshToken(refresh_token);

          // セッションを設定して認証状態を確認
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (error) {
            throw error;
          }

          if (data.user) {
            setStatus("form");
          } else {
            throw new Error("ユーザー情報を取得できませんでした");
          }
        } else {
          // 必要なパラメータが不足している場合
          setStatus("expired");
        }
      } catch (error) {
        console.error("Auth callback error:", error);
        setStatus("error");
        setGeneralError(
          error instanceof Error
            ? error.message
            : "認証の処理中にエラーが発生しました"
        );
      }
    };

    handleAuthCallback();
  }, []);

  const onSubmit = async (values: FormValues) => {
    if (!accessToken || !refreshToken) {
      setGeneralError("認証情報が見つかりません");
      return;
    }

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
            setStatus("expired");
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
  if (status === "error" || status === "expired") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <AlertCircleIcon className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl">
            {status === "expired" ? "リンクの有効期限切れ" : "エラー"}
          </CardTitle>
          <CardDescription>
            {status === "expired"
              ? "パスワードリセットリンクの有効期限が切れています。新しいリセットリンクを要求してください。"
              : generalError || "パスワードリセット中にエラーが発生しました"}
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
