"use client";

/**
 * 通用 Modal 组件
 *
 * 特性：
 * - Portal 渲染到 document.body
 * - role="dialog" + aria-modal + aria-labelledby
 * - 焦点陷阱（Tab/Shift+Tab 循环）
 * - Esc 键关闭
 * - 打开时 body 滚动锁定
 * - 打开时自动聚焦首个可聚焦元素，关闭时焦点返回触发元素
 * - 遮罩点击关闭
 * - 进出动画
 * - 移动端内容可滚动（max-h + overflow-y-auto）
 */

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /** 关闭时是否允许点击遮罩，默认 true */
  closeOnOverlay?: boolean;
  /** 自定义 aria-labelledby id（默认自动生成） */
  titleId?: string;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

function useModalTitleId(titleId?: string) {
  const generated = useId();
  return titleId ?? generated;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  closeOnOverlay = true,
  titleId,
  className,
}: ModalProps) {
  const resolvedTitleId = useModalTitleId(titleId);
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  // 处理挂载（SSR 安全）
  useEffect(() => {
    setMounted(true);
  }, []);

  // 打开时：记录焦点、锁定 body 滚动、聚焦弹窗
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // 聚焦弹窗内首个可聚焦元素
    const focusTimer = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;
      const focusable = container.querySelector<HTMLElement>(
        'input, textarea, select, button, a[href], [tabindex]:not([tabindex="-1"])'
      );
      (focusable ?? container).focus();
    }, 50);

    return () => {
      document.body.style.overflow = originalOverflow;
      clearTimeout(focusTimer);
      // 恢复焦点到触发元素
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  // Esc 关闭 + 焦点陷阱
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const container = containerRef.current;
      if (!container) return;
      const focusables = Array.from(
        container.querySelectorAll<HTMLElement>(
          'input, textarea, select, button, a[href], [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e: MouseEvent) => {
        if (closeOnOverlay && e.target === e.currentTarget) onClose();
      }}
    >
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        aria-hidden="true"
      />
      {/* 弹窗主体 */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? resolvedTitleId : undefined}
        tabIndex={-1}
        className={cn(
          "relative w-full rounded-xl bg-card shadow-xl outline-none",
          "animate-in zoom-in-95 fade-in slide-in-from-bottom-2 duration-200",
          SIZE_CLASSES[size],
          className
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 border-b border-border p-5 pb-4">
            <div className="min-w-0">
              {title && (
                <h2 id={resolvedTitleId} className="text-lg font-semibold text-foreground">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground min-h-[40px] min-w-[40px] flex items-center justify-center"
              aria-label="关闭弹窗"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        )}
        {/* 内容区：移动端可滚动 */}
        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto p-5">
          {children}
        </div>
        {footer && (
          <div className="border-t border-border p-5 pt-4 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
