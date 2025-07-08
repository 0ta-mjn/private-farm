"use client";

import {  useState } from "react";
import { Button } from "@/shadcn/button";
import { EditIcon } from "lucide-react";
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
import { AuthError, AuthUserIdentity } from "@repo/auth-client";
import { auth } from "@/lib/auth-provider";

interface PasswordSettingRowProps {
  identity?: AuthUserIdentity | null;
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

  // パスワード変更フォーム（コードを含む統合版）
  const passwordChangeForm = useForm<PasswordChangeValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  // ダイアログリセット
  const resetDialog = () => {
    setError(null);
    setSuccess(null);
    passwordChangeForm.reset();
  };

  // コード確認とパスワード変更処理
  const onVerifyOtpAndChangePassword = async (values: PasswordChangeValues) => {
    setIsLoading(true);
    setError(null);

    try {
      // Supabaseでパスワード更新（nonceも含む）
      await auth.updatePassword({
        password: values.newPassword,
      });

      // 成功時の処理
      resetDialog();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Password update error:", error);
      if (error instanceof AuthError) {
        switch (error.code) {
          case "password_mismatch":
            setError(
              "新しいパスワードは現在のパスワードと異なるものを設定してください。"
            );
            break;
          case "weak_password":
            setError(
              "パスワードが脆弱です。より強力なパスワードを設定してください。"
            );
            break;
          case "rate_limit_exceeded":
            setError(
              "リクエストが多すぎます。しばらく時間をおいてから再度お試しください。"
            );
            break;
          default:
            setError(
              error.message || "パスワードの変更中にエラーが発生しました。"
            );
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    resetDialog();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>パスワード変更</DialogTitle>
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

        <Form {...passwordChangeForm}>
          <form
            onSubmit={passwordChangeForm.handleSubmit(
              onVerifyOtpAndChangePassword
            )}
            className="space-y-4"
          >
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
              <Button type="button" variant="outline" onClick={handleCancel}>
                キャンセル
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "変更中..." : "パスワードを変更"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
