"use client";

/**
 * Badge：语义化徽章
 * 变体：default / primary / success / warning / danger / info
 * 自动适配暗黑模式
 */

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default:
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  primary:
    "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  success:
    "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300",
  warning:
    "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  danger:
    "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  info:
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        VARIANT_CLASSES[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
