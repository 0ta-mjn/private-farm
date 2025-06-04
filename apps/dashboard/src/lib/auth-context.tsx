"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { useRouter } from "next/navigation";

// ユーザーコンテキスト
interface UserContextType {
  user: User | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// セッションコンテキスト
interface SessionContextType {
  session: Session | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 初期セッションを取得
    const getInitialSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("Error getting session:", error);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }

      setLoading(false);
    };

    getInitialSession();

    // 認証状態の変更をリスニング
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // クリーンアップ
    return () => subscription.unsubscribe();
  }, []);

  const router = useRouter();
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
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
