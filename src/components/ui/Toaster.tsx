"use client";

/**
 * Toast 渲染器：固定在视口右上角，自动堆叠 + 自动消失
 * 挂载在 layout.tsx 中，全局唯一实例
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  XCircle,
  Info,
  AlertTriangle,
  Loader2,
  X,
} from "lucide-react";
import { useToastStore, type ToastType } from "./toast";
import { cn } from "@/lib/utils";

const TYPE_CONFIG: Record<
  ToastType,
  { icon: typeof CheckCircle2; iconClass: string; borderClass: string }
> = {
  success: {
    icon: CheckCircle2,
    iconClass: "text-green-500",
    borderClass: "border-l-green-500",
  },
  error: {
    icon: XCircle,
    iconClass: "text-red-500",
    borderClass: "border-l-red-500",
  },
  info: {
    icon: Info,
    iconClass: "text-blue-500",
    borderClass: "border-l-blue-500",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-amber-500",
    borderClass: "border-l-amber-500",
  },
  loading: {
    icon: Loader2,
    iconClass: "text-blue-500 animate-spin",
    borderClass: "border-l-blue-500",
  },
};

function ToastCard({ id, type, title, description, duration }: {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration: number;
}) {
  const config = TYPE_CONFIG[type];
  const Icon = config.icon;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    if (duration > 0) {
      timerRef.current = setTimeout(() => dismiss(id), duration);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [id, duration, dismiss]);

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      aria-live={type === "error" ? "assertive" : "polite"}
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-border border-l-4 bg-card p-4 shadow-lg",
        "animate-in slide-in-from-right-full fade-in duration-300",
        config.borderClass
      )}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", config.iconClass)} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground break-words">{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => dismiss(id)}
        className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground min-h-[36px] min-w-[36px] flex items-center justify-center"
        aria-label="关闭通知"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  // 用 mounted 模式避免 SSR/CSR 水合不匹配
  // SSR 和首次客户端渲染都返回 null，useEffect 后才渲染 portal
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed top-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2"
      aria-label="通知"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} {...t} />
      ))}
    </div>,
    document.body
  );
}
