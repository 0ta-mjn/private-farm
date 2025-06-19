"use client";

import { useMemo, useState } from "react";
import { Button } from "@/shadcn/button";
import { EditIcon } from "lucide-react";
import { UserIdentity } from "@supabase/supabase-js";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/shadcn/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shadcn/dialog";
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
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/auth-context";

interface PasswordSettingRowProps {
  identity?: UserIdentity | null;
  onSuccess?: () => void | Promise<unknown>;
}

export function PasswordSettingRow({
  identity,
  onSuccess,
}: PasswordSettingRowProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handlePasswordAction = () => {
    setDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    onSuccess?.();
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">パスワード</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {identity
              ? "********"
              : "メールアドレスとパスワードでログインできます。"}
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePasswordAction}>
            <EditIcon className="h-4 w-4 mr-2" />
            {identity ? "変更" : "設定"}
          </Button>
        </div>
      </div>

      <PasswordChangeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleDialogSuccess}
      />
    </>
  );
}

// パスワード変更フォームのバリデーションスキーマ（コードを含む）
const passwordChangeSchema = z
  .object({
    nonce: z
      .string()
      .min(6, "コードは6桁で入力してください")
      .max(6, "コードは6桁で入力してください"),
    newPassword: z
      .string()
      .min(8, "パスワードは8文字以上で入力してください")
      .regex(
        /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "パスワードは大文字、小文字、数字を含む必要があります"
      ),
    confirmPassword: z.string().min(1, "パスワード確認を入力してください"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "パスワードが一致しません",
    path: ["confirmPassword"],
  });

type PasswordChangeValues = z.infer<typeof passwordChangeSchema>;

interface PasswordChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PasswordChangeDialog({
  open,
  onOpenChange,
  onSuccess,
}: PasswordChangeDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [step, setStep] = useState<
    "send-otp" | "verify-otp" | "change-password"
  >("send-otp");

  const user = useUser();
  const email = useMemo(() => user?.email || "", [user]);

  // パスワード変更フォーム（コードを含む統合版）
  const passwordChangeForm = useForm<PasswordChangeValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      nonce: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // ダイアログリセット
  const resetDialog = () => {
    setStep("send-otp");
    setError(null);
    setSuccess(null);
    passwordChangeForm.reset();
  };

  // コード送信処理
  const onSendOtp = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Supabaseのreauthenticateメソッドを使用
      const { error } = await supabase.auth.reauthenticate();

      if (error) {
        setError(error.message || "コードの送信中にエラーが発生しました。");
        return;
      }

      // reauthenticateは成功時に自動的にコードを送信
      setSuccess(`${email}に認証コードを送信しました。`);
      setStep("verify-otp");
    } catch (err) {
      console.error("コード request error:", err);
      setError("コードの送信中にエラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  };

  // コード確認とパスワード変更処理
  const onVerifyOtpAndChangePassword = async (values: PasswordChangeValues) => {
    setIsLoading(true);
    setError(null);

    try {
      // Supabaseでパスワード更新（nonceも含む）
      const { error } = await supabase.auth.updateUser({
        password: values.newPassword,
        nonce: values.nonce,
        email,
      });

      if (error) {
        switch (error.code) {
          case "same_password":
            setError(
              "新しいパスワードは現在のパスワードと異なるものを設定してください。"
            );
            break;
          case "weak_password":
            setError(
              "パスワードが脆弱です。より強力なパスワードを設定してください。"
            );
            break;
          case "over_request_rate_limit":
            setError(
              "リクエストが多すぎます。しばらく時間をおいてから再度お試しください。"
            );
            break;
          case "invalid_otp":
            setError("コードが無効です。正しいコードを入力してください。");
            break;
          default:
            setError(
              error.message || "パスワードの変更中にエラーが発生しました。"
            );
            break;
        }
        return;
      }

      // 成功時の処理
      resetDialog();
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      console.error("Password update error:", err);
      setError("パスワードの変更中にエラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    resetDialog();
    onOpenChange(false);
  };

  const getDialogTitle = () => {
    switch (step) {
      case "send-otp":
        return "パスワード変更 - 認証";
      case "verify-otp":
        return "パスワード変更 - コード確認";
      case "change-password":
        return "パスワード変更 - 新しいパスワード";
      default:
        return "パスワード変更";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
        </DialogHeader>

        {/* エラーメッセージ */}
        {error && (
          <Alert variant="destructive">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 成功メッセージ */}
        {success && (
          <Alert>
            <AlertCircleIcon className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* ステップ1: コード送信 */}
        {step === "send-otp" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              パスワード変更には本人確認が必要です。
              <br />
              {email}に認証コードを送信します。
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel}>
                キャンセル
              </Button>
              <Button onClick={onSendOtp} disabled={isLoading}>
                {isLoading ? "送信中..." : "コードを送信"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ステップ2: コード確認とパスワード設定 */}
        {step === "verify-otp" && (
          <Form {...passwordChangeForm}>
            <form
              onSubmit={passwordChangeForm.handleSubmit(
                onVerifyOtpAndChangePassword
              )}
              className="space-y-4"
            >
              {/* コード入力 */}
              <FormField
                control={passwordChangeForm.control}
                name="nonce"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>認証コード</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="6桁のコードを入力"
                        maxLength={6}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* パスワード設定フォーム */}
              <div className="space-y-4">
                {/* 新しいパスワード */}
                <FormField
                  control={passwordChangeForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>新しいパスワード</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showNewPassword ? "text" : "password"}
                            placeholder="新しいパスワードを入力"
                            className="pr-10"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          >
                            {showNewPassword ? (
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

                {/* パスワード確認 */}
                <FormField
                  control={passwordChangeForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>新しいパスワード（確認）</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="新しいパスワードを再入力"
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
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("send-otp")}
                >
                  戻る
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "変更中..." : "パスワードを変更"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
