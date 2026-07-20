"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Profile } from "@/types";
import type { User } from "@supabase/supabase-js";

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string,
    username: string
  ) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: {
    username?: string;
    avatarUrl?: string;
    bio?: string;
  }) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: false,
  configured: false,
  signIn: async () => ({ error: "Supabase 未配置" }),
  signUp: async () => ({ error: "Supabase 未配置" }),
  signOut: async () => {},
  updateProfile: async () => ({ error: "Supabase 未配置" }),
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  // 获取用户 profile
  const fetchProfile = useCallback(async (userId: string, signal?: AbortSignal) => {
    if (!supabase) return;
    const query = supabase
      .from("profiles")
      .select("*")
      .eq("id", userId);
    const { data, error } = await (signal ? query.abortSignal(signal) : query).single();
    if (signal?.aborted) return;
    if (error) {
      console.error("[Auth] 获取用户资料失败:", error.message);
      return;
    }
    if (data) {
      setProfile({
        id: data.id,
        email: data.email,
        username: data.username,
        avatarUrl: data.avatar_url ?? undefined,
        bio: data.bio ?? undefined,
        createdAt: data.created_at,
      });
    }
  }, []);

  // 初始化：监听 auth 状态变化
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();

    // 获取当前 session（加 catch 避免网络异常导致永久 loading）
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (controller.signal.aborted) return;
        setUser(session?.user ?? null);
        if (session?.user) {
          void fetchProfile(session.user.id, controller.signal);
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.error("[Auth] 获取 session 失败:", err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    // 监听后续变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (controller.signal.aborted) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        void fetchProfile(session.user.id, controller.signal);
      } else {
        setProfile(null);
      }
    });

    return () => {
      controller.abort();
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: "Supabase 未配置" };
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return error ? { error: error.message } : {};
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, username: string) => {
      if (!supabase) return { error: "Supabase 未配置" };
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      if (error) return { error: error.message };

      // profile 由 schema.sql 中的 auth.users trigger 创建。不要在这里重复
      // upsert：它会与触发器的用户名去重逻辑竞争，并可能覆盖已有资料。
      void data;
      return {};
    },
    []
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  const updateProfile = useCallback(
    async (updates: { username?: string; avatarUrl?: string; bio?: string }) => {
      if (!supabase || !user) return { error: "未登录" };
      const { error } = await supabase
        .from("profiles")
        .update({
          username: updates.username,
          avatar_url: updates.avatarUrl,
          bio: updates.bio,
        })
        .eq("id", user.id);
      if (error) return { error: error.message };

      // 更新本地状态
      setProfile((prev) => (prev ? { ...prev, ...updates } : null));
      return {};
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        configured: isSupabaseConfigured,
        signIn,
        signUp,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
