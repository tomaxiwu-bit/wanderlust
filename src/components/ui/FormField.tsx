"use client";

/**
 * FormField：统一的表单字段容器
 *
 * 特性：
 * - label 与 input 自动关联（htmlFor + id）
 * - 错误提示带 role="alert"
 * - 帮助文案
 * - 必填标记
 */

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  /** 传 children 时，FormField 会通过 render props 提供 id 和 aria-describedby */
  children: (props: { id: string; ariaDescribedBy?: string }) => ReactNode;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
}

export function FormField({
  label,
  children,
  error,
  hint,
  required = false,
  className,
}: FormFieldProps) {
  const generatedId = useId();
  const fieldId = `field-${generatedId}`;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;

  const describedBy = [
    error ? errorId : null,
    hint ? hintId : null,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={fieldId}
        className="block text-sm font-medium text-foreground"
      >
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children({ id: fieldId, ariaDescribedBy: describedBy })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
