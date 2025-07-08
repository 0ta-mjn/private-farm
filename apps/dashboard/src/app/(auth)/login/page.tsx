"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/shadcn/button";
import { Input } from "@/shadcn/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shadcn/card";
import { Alert, AlertDescription } from "@/shadcn/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shadcn/form";
import { EyeIcon, EyeOffIcon, AlertCircleIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DiscordSvg from "@/assets/discord-symbol.svg";
import { client } from "@/rpc/client";
import { auth } from "@/lib/auth-provider";
import { AuthError } from "@repo/auth-client";

// フォームバリデーションスキーマ
const formSchema = z.object({
  email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .email("有効なメールアドレスを入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Discord認証処理
  const handleDiscordSignup = async () => {
    setIsLoading(true);
    setGeneralError(null);

    try {
      await auth.redirectOAuthSigninUrl("discord", {
        redirectUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      });
    } catch (err) {
      console.error("Discord signup error:", err);
      setGeneralError("Discord認証中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  // フォーム送信処理
  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    setGeneralError(null);

    try {
      // Auth Provider にログインリクエスト
      const data = await auth.signIn({
        provider: "email",
        input: {
          email: values.email,
          password: values.password,
        },
      });

      if (data?.user) {
        try {
          // 初期設定状態を確認
          const setupStatus = await client.user.setup.$get();

          if (setupStatus.isCompleted) {
            // 初期設定完了済みの場合はダッシュボードへ
            router.push("/dashboard");
          } else {
            // 初期設定未完了の場合はセットアップページへ
            router.push("/setup");
          }
        } catch (setupError) {
          console.error("Setup check error:", setupError);
          // setupCheck でエラーが発生した場合は、暫定的にダッシュボードへ
          setGeneralError(
            "初期設定状態の確認に失敗しました。後ほど再度お試しください。"
          );
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      if (error instanceof AuthError) {
        // エラーコードによる分岐処理
        switch (error.code) {
          case "invalid_credentials":
            setGeneralError(
              "メールアドレスまたはパスワードが正しくありません。"
            );
            break;
          case "email_not_verified":
            setGeneralError(
              "メールアドレスが確認されていません。確認メールをご確認いただくか、再度ご登録ください。"
            );
            break;
          case "account_locked":
            setGeneralError(
              "ログイン試行回数が多すぎます。しばらく時間をおいてから再度お試しください。"
            );
            break;
          case "account_disabled":
            setGeneralError(
              "サインインが無効になっています。管理者にお問い合わせください。"
            );
            break;
          default:
            setGeneralError(
              error.message || "ログイン中にエラーが発生しました"
            );
            break;
        }
      } else {
        setGeneralError("ログイン中にエラーが発生しました");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">ログイン</CardTitle>
        <CardDescription>Private Farm にログインしてください。</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Discordサインアップボタン */}
        <div className="space-y-4 mb-6">
          <Button
            type="button"
            variant="ghost"
            className="w-full flex items-center justify-center gap-3 bg-discord-bg text-white hover:bg-discord-bg/90 hover:text-white"
            onClick={handleDiscordSignup}
            disabled={isLoading}
          >
            <DiscordSvg className="w-5 h-5" />
            {isLoading ? "認証中..." : "Discordでログイン"}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                または
              </span>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* メールアドレス */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>メールアドレス</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* パスワード */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>パスワード</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="パスワードを入力"
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
              {isLoading ? "ログイン中..." : "ログイン"}
            </Button>
          </form>
        </Form>

        {/* パスワードリセットリンク */}
        <div className="mt-4 text-center">
          <Link href="/reset-password">
            <Button
              variant="link"
              className="p-0 h-auto text-sm hover:underline"
            >
              パスワードをお忘れの方
            </Button>
          </Link>
        </div>

        {/* サインアップリンク */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            アカウントをお持ちでない方は{" "}
            <Link href="/signup">
              <Button variant="link" className="p-0 h-auto hover:underline">
                新規登録
              </Button>
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
