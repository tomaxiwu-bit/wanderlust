"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { SupabaseNotConfiguredNotice } from "@/components/layout/SupabaseNotConfigured";
import { FormField, Button } from "@/components/ui";
import { Plane, Mail, Lock, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, configured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-8">
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Plane className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">欢迎回来</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          登录你的 Wanderlust 账号
        </p>
      </div>

      {!configured && <SupabaseNotConfiguredNotice className="mb-6" />}

      <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="••••••••"
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
          登录
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        还没有账号？{" "}
        <Link
          href="/auth/register"
          className="font-medium text-primary hover:underline"
        >
          注册新账号
        </Link>
      </p>
    </div>
  );
}

