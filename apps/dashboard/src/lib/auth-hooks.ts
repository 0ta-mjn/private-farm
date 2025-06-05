"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, useAuthLoading } from "./auth-context";
import { useTRPC } from "@/trpc/client";
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
  const trpc = useTRPC();

  // 初期設定状態の確認
  const { data: setupStatus, isLoading: isCheckingSetup } = useQuery(
    trpc.user.setupCheck.queryOptions(undefined, {
      enabled: !!user && !loading, // ユーザーが認証済みの場合のみ実行
    })
  );

  useEffect(() => {
    // ローディング中は何もしない
    if (loading || isCheckingSetup) return;

    // ユーザーが認証されていない場合はログインページにリダイレクト
    if (!user) {
      router.replace(loginRedirectTo);
      return;
    }

    // 初期設定が完了していない場合はセットアップページにリダイレクト
    if (setupStatus && !setupStatus.isCompleted) {
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
      router.replace(redirectTo);
    }
  }, [user, loading, router, redirectTo]);

  return {
    user,
    loading,
  };
}
