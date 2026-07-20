"use client";

/**
 * 确认对话框：替代原生 confirm()
 *
 * 用法（命令式）：
 *   import { confirm } from "@/components/ui/ConfirmDialog";
 *   const ok = await confirm({
 *     title: "删除行程？",
 *     description: "此操作不可撤销",
 *     confirmText: "删除",
 *     variant: "danger",
 *   });
 *   if (ok) { ... }
 *
 * 用法（声明式）：
 *   <ConfirmDialog open={...} onConfirm={...} onCancel={...} ... />
 */

import { create } from "zustand";
import { useEffect, useState, type ReactNode } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { AlertTriangle, Trash2 } from "lucide-react";

type ConfirmVariant = "default" | "danger";

interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  resolve?: (value: boolean) => void;
  openConfirm: (options: ConfirmOptions) => Promise<boolean>;
  close: (value: boolean) => void;
}

const useConfirmStore = create<ConfirmState>((set, get) => ({
  open: false,
  title: "",
  description: "",
  confirmText: "确认",
  cancelText: "取消",
  variant: "default",
  openConfirm: (options) => {
    return new Promise<boolean>((resolve) => {
      set({ ...options, open: true, resolve });
    });
  },
  close: (value) => {
    const { resolve } = get();
    resolve?.(value);
    set({ open: false, resolve: undefined });
  },
}));

/** 命令式确认：返回 Promise<boolean> */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return useConfirmStore.getState().openConfirm(options);
}

/** ConfirmDialog 渲染器：挂载在 layout 中，全局唯一 */
export function ConfirmDialogProvider() {
  const {
    open,
    title,
    description,
    confirmText,
    cancelText,
    variant,
    close,
  } = useConfirmStore();

  // 等待客户端挂载（SSR 安全）
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDanger = variant === "danger";

  return (
    <Modal
      open={open}
      onClose={() => close(false)}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={() => close(false)}>
            {cancelText}
          </Button>
          <Button
            variant={isDanger ? "destructive" : "primary"}
            size="sm"
            onClick={() => close(true)}
            leftIcon={isDanger ? <Trash2 className="h-4 w-4" aria-hidden="true" /> : undefined}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        {isDanger && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
          </div>
        )}
        <div className="flex-1 text-sm text-muted-foreground">
          {description}
        </div>
      </div>
    </Modal>
  );
}
