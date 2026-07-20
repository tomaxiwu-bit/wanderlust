"use client";

/**
 * Loading 组件
 *
 * - Loading：居中 spinner，用于页面级加载
 * - Spinner：内联 spinner
 * - Skeleton：骨架屏占位
 */

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2
      className={cn("h-5 w-5 animate-spin text-muted-foreground", className)}
      aria-hidden="true"
    />
  );
}

export function Loading({
  className,
  label = "加载中",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center py-20",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-secondary/60",
        className
      )}
      aria-hidden="true"
    />
  );
}
