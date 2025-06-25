"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, useAuthLoading } from "./auth-context";
import { users } from "@/rpc/factory";
import { ClientError } from "@/rpc/client";
import { useQuery } from "@tanstack/react-query";

/**
 * 認証が必要なページで使用するフック
 * ユーザーが認証されていない場合は、ログインページにリダイレクトする
 */
export function useRequireAuth(redirectTo: string = "/login") {
  const user = useUser();
  const loading = useAuthLoading();
  const router = useRouter();

  useEffect(() => {
    // ローディング中は何もしない
    if (loading) return;

    // ユーザーが認証されていない場合はログインページにリダイレクト
    if (!user) {
      router.replace(redirectTo);
    }
  }, [user, loading, router, redirectTo]);

  return {
    user,
    loading,
  };
}

/**
 * 認証と初期設定の両方が必要なページで使用するフック
 * ユーザーが認証されていない場合は、ログインページにリダイレクトし、
 * 認証されているが初期設定が完了していない場合は、セットアップページにリダイレクトする
 */
export function useRequireAuthAndSetup(
  loginRedirectTo: string = "/login",
  setupRedirectTo: string = "/setup"
) {
  const user = useUser();
  const loading = useAuthLoading();
  const router = useRouter();

  // 初期設定状態の確認
  const {
    data: setupStatus,
    isLoading: isCheckingSetup,
    error,
  } = useQuery({
    ...users.setupCheck(),
    enabled: !!user && !loading, // ユーザーが認証済みの場合のみ実行
    retry: (_, e: ClientError) => {
      switch (e.status) {
        case 401:
          // 認証エラーの場合はリトライしない
          return false;
        default:
          // その他のエラーはリトライする
          return true;
      }
    },
  });

  useEffect(() => {
    // ローディング中は何もしない
    if (loading || isCheckingSetup) return;

    // ユーザーが認証されていない場合またはAPIエラーの場合はログインページにリダイレクト
    if (!user || (error instanceof ClientError && error.status === 401)) {
      console.info(
        "Redirecting to login page due to unauthenticated user or API error"
      );
      router.replace(loginRedirectTo);
      return;
    }

    // 初期設定が完了していない場合はセットアップページにリダイレクト
    if (setupStatus && !setupStatus.isCompleted) {
      console.info(setupStatus);
      console.info("Redirecting to setup page due to incomplete setup");
      router.replace(setupRedirectTo);
      return;
    }
  }, [
    user,
    loading,
    setupStatus,
    isCheckingSetup,
    router,
    loginRedirectTo,
    setupRedirectTo,
    error,
  ]);

  return {
    user,
    loading: loading || isCheckingSetup,
    setupStatus,
  };
}

/**
 * 認証済みユーザーをログインページから除外するフック
 * 認証済みの場合はダッシュボードにリダイレクトする
 */
export function useRedirectIfAuthenticated(redirectTo: string = "/dashboard") {
  const user = useUser();
  const loading = useAuthLoading();
  const router = useRouter();

  useEffect(() => {
    // ローディング中は何もしない
    if (loading) return;

    // ユーザーが認証済みの場合はダッシュボードにリダイレクト
    if (user) {
      console.info("Redirecting to dashboard due to authenticated user");
      router.replace(redirectTo);
    }
  }, [user, loading, router, redirectTo]);

  return {
    user,
    loading,
  };
}
