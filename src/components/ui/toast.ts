/**
 * Toast 状态管理（基于 Zustand，无外部依赖）
 *
 * 用法：
 *   import { toast } from "@/components/ui/toast";
 *   toast.success("保存成功");
 *   toast.error("网络异常，请重试");
 *   toast.promise(asyncFn, { loading: "同步中...", success: "完成", error: "失败" });
 */

import { create } from "zustand";

export type ToastType = "success" | "error" | "info" | "warning" | "loading";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration: number; // 0 表示不自动关闭（loading 类型默认 0）
  createdAt: number;
}

interface ToastState {
  toasts: ToastItem[];
  add: (toast: Omit<ToastItem, "id" | "createdAt"> & { id?: string }) => string;
  dismiss: (id: string) => void;
  update: (id: string, updates: Partial<Omit<ToastItem, "id" | "createdAt">>) => void;
  clear: () => void;
}

let counter = 0;
function genId() {
  counter += 1;
  return `toast-${Date.now()}-${counter}`;
}

const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  add: ({ id, ...rest }) => {
    const toastId = id ?? genId();
    const item: ToastItem = {
      id: toastId,
      createdAt: Date.now(),
      ...rest,
    };
    set((state) => ({ toasts: [...state.toasts, item] }));
    return toastId;
  },
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  update: (id, updates) =>
    set((state) => ({
      toasts: state.toasts.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    })),
  clear: () => set({ toasts: [] }),
}));

/** 生成默认 duration */
function defaultDuration(type: ToastType): number {
  if (type === "loading") return 0; // loading 不自动关闭
  if (type === "error") return 6000; // 错误稍长
  return 4000;
}

/** Toast API：便捷调用 */
export const toast = {
  success(title: string, description?: string) {
    return useToastStore.getState().add({
      type: "success",
      title,
      description,
      duration: defaultDuration("success"),
    });
  },
  error(title: string, description?: string) {
    return useToastStore.getState().add({
      type: "error",
      title,
      description,
      duration: defaultDuration("error"),
    });
  },
  info(title: string, description?: string) {
    return useToastStore.getState().add({
      type: "info",
      title,
      description,
      duration: defaultDuration("info"),
    });
  },
  warning(title: string, description?: string) {
    return useToastStore.getState().add({
      type: "warning",
      title,
      description,
      duration: defaultDuration("warning"),
    });
  },
  loading(title: string, description?: string) {
    return useToastStore.getState().add({
      type: "loading",
      title,
      description,
      duration: 0,
    });
  },
  dismiss(id: string) {
    useToastStore.getState().dismiss(id);
  },
  /** Promise 包装：自动管理 loading → success/error 状态 */
  async promise<T>(
    fn: () => Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: unknown) => string);
    }
  ): Promise<T> {
    const id = useToastStore.getState().add({
      type: "loading",
      title: options.loading,
      duration: 0,
    });
    try {
      const data = await fn();
      const successMsg =
        typeof options.success === "function"
          ? options.success(data)
          : options.success;
      useToastStore.getState().update(id, {
        type: "success",
        title: successMsg,
        duration: defaultDuration("success"),
      });
      return data;
    } catch (err) {
      const errorMsg =
        typeof options.error === "function"
          ? options.error(err)
          : options.error;
      useToastStore.getState().update(id, {
        type: "error",
        title: errorMsg,
        duration: defaultDuration("error"),
      });
      throw err;
    }
  },
};

export { useToastStore };
