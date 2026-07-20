"use client";

/**
 * 全局错误边界
 * 捕获子页面抛出的运行时错误，展示友好提示 + 重试按钮
 */

import { useEffect } from "react";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ErrorBoundary]", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-bold">出错了</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        页面加载时遇到了问题。可以尝试重新加载，或返回首页。
      </p>
      {error.digest && (
        <p className="mt-2 text-xs text-muted-foreground">
          错误代码: {error.digest}
        </p>
      )}
      <div className="mt-6 flex gap-3">
        <Button
          variant="primary"
          leftIcon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
          onClick={reset}
        >
          重试
        </Button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          返回首页
        </Link>
      </div>
    </div>
  );
}
