"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { SupabaseNotConfiguredNotice } from "@/components/layout/SupabaseNotConfigured";
import { FormField, Button } from "@/components/ui";
import {
  Plane,
  Mail,
  Lock,
  User,
  Loader2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { signUp, configured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }
    if (password.length < 6) {
      setError("密码至少需要 6 个字符");
      return;
    }
    if (username.length < 2) {
      setError("用户名至少需要 2 个字符");
      return;
    }

    setLoading(true);
    const result = await signUp(email, password, username);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      // 检查是否需要邮箱验证
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 2000);
    }
  };

  if (success) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-8 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold">注册成功</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          正在跳转到行程面板...
        </p>
        <Loader2 className="mx-auto mt-4 h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-8">
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Plane className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">创建账号</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          开始你的旅行规划之旅
        </p>
      </div>

      {!configured && <SupabaseNotConfiguredNotice className="mb-6" />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="用户名" required>
          {({ id }) => (
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id={id}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="旅行者"
                className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                required
                disabled={!configured}
              />
            </div>
          )}
        </FormField>

        <FormField label="邮箱" required>
          {({ id }) => (
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id={id}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                required
                disabled={!configured}
              />
            </div>
          )}
        </FormField>

        <FormField label="密码" required>
          {({ id }) => (
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id={id}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 个字符"
                className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                required
                disabled={!configured}
              />
            </div>
          )}
        </FormField>

        <FormField label="确认密码" required>
          {({ id }) => (
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id={id}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入密码"
                className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                required
                disabled={!configured}
              />
            </div>
          )}
        </FormField>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          loading={loading}
          disabled={!configured}
        >
          注册
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        已有账号？{" "}
        <Link
          href="/auth/login"
          className="font-medium text-primary hover:underline"
        >
          去登录
        </Link>
      </p>
    </div>
  );
}

