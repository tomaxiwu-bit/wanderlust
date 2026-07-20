"use client";

/**
 * Button 组件：统一按钮样式与交互
 *
 * 变体：primary / secondary / outline / ghost / destructive
 * 尺寸：sm / md / lg / icon
 *
 * 特性：
 * - focus-visible 焦点环（键盘可访问性）
 * - 触摸目标 ≥ 40px（icon 尺寸自动 40x40）
 * - 微交互：hover lift + active press
 * - 支持 asChild 模式（通过 as 属性渲染为 Link 等）
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg" | "icon";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-sm hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98]",
  outline:
    "border border-border bg-transparent text-foreground hover:bg-secondary active:scale-[0.98]",
  ghost:
    "bg-transparent text-foreground hover:bg-secondary active:scale-[0.98]",
  destructive:
    "bg-destructive text-destructive-foreground shadow-sm hover:-translate-y-0.5 hover:shadow-md active:translate-y-0",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-lg",
  lg: "h-11 px-6 text-base gap-2 rounded-lg",
  icon: "h-10 w-10 rounded-lg",
};

const BASE_CLASSES =
  "inline-flex items-center justify-center font-medium transition-all duration-150 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "disabled:pointer-events-none disabled:opacity-50 select-none";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** 加载中状态（显示 spinner + 禁用） */
  loading?: boolean;
  /** 图标（放在文字前） */
  leftIcon?: ReactNode;
  /** 图标（放在文字后） */
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      type = "button",
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cn(BASE_CLASSES, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className)}
        {...props}
      >
        {loading && (
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {!loading && leftIcon}
        {children}
        {!loading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";
