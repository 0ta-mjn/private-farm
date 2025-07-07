"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import { auth } from "./auth-provider";
import { AuthSession, AuthUser } from "@repo/auth-client";

// ユーザーコンテキスト
interface UserContextType {
  user: AuthUser | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// セッションコンテキスト
interface SessionContextType {
  session: AuthSession | null;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

// 認証ローディングコンテキスト
interface AuthLoadingContextType {
  loading: boolean;
}

const AuthLoadingContext = createContext<AuthLoadingContextType>({
  loading: true,
});

// 認証アクションコンテキスト（メソッドのみ、再レンダリングを避けるため）
interface AuthActionsContextType {
  signOut: () => Promise<void>;
}

const AuthActionsContext = createContext<AuthActionsContextType | undefined>(
  undefined
);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 初期セッションを取得
    const getInitialSession = async () => {
      try {
        const session = await auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error("Error getting session:", error);
      }
      setLoading(false);
    };

    getInitialSession();

    // 認証状態の変更をリスニング
    const unsubscribe = auth.onAuthStateChange((session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // クリーンアップ
    return () => unsubscribe();
  }, []);

  const router = useRouter();
  const signOut = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setSession(null);
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  // アクション関数は変化しないのでuseCallbackは不要（signOutは常に同じ参照）
  const authActions: AuthActionsContextType = {
    signOut,
  };

  return (
    <AuthLoadingContext.Provider value={{ loading }}>
      <UserContext.Provider value={{ user }}>
        <SessionContext.Provider value={{ session }}>
          <AuthActionsContext.Provider value={authActions}>
            {children}
          </AuthActionsContext.Provider>
        </SessionContext.Provider>
      </UserContext.Provider>
    </AuthLoadingContext.Provider>
  );
}

// 個別のフック
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within an AuthProvider");
  }
  return context.user;
}

export function useUserId() {
  const user = useUser();
  return useMemo(() => user?.id || null, [user?.id]);
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within an AuthProvider");
  }
  return context.session;
}

export function useAuthLoading() {
  const context = useContext(AuthLoadingContext);
  if (context === undefined) {
    throw new Error("useAuthLoading must be used within an AuthProvider");
  }
  return context.loading;
}

export function useAuthActions() {
  const context = useContext(AuthActionsContext);
  if (context === undefined) {
    throw new Error("useAuthActions must be used within an AuthProvider");
  }
  return context;
}

// 便利なフック（複数の値が必要な場合）
export function useAuth() {
  const user = useUser();
  const session = useSession();
  const loading = useAuthLoading();
  const { signOut } = useAuthActions();

  return {
    user,
    session,
    loading,
    signOut,
  };
}
