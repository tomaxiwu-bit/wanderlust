import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { differenceInCalendarDays, parseISO } from "date-fns";

/** 合并 Tailwind 类名 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 生成 UUID（浏览器环境） */
export function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** 格式化货币 */
export function formatCurrency(
  amount: number,
  currency: string,
  locale = "zh-CN"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** 格式化日期 */
export function formatDate(
  date: string | Date,
  format: "short" | "long" | "full" = "long"
): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  const options: Record<string, Intl.DateTimeFormatOptions> = {
    short: { year: "numeric", month: "2-digit", day: "2-digit" },
    long: { year: "numeric", month: "long", day: "numeric" },
    full: {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    },
  };
  return new Intl.DateTimeFormat("zh-CN", options[format]).format(d);
}

/**
 * 计算两个日期之间的天数（含首尾）
 * 使用 date-fns 的 differenceInCalendarDays 避免时区问题
 * 例如 2025-03-01 ~ 2025-03-05 返回 5
 */
export function daysBetween(startDate: string, endDate: string): number {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
  const diff = differenceInCalendarDays(end, start) + 1;
  return diff > 0 ? diff : 1;
}

/** 分钟数转可读时长 */
export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) return "—";
  if (minutes < 60) return `${minutes} 分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} 小时 ${m} 分钟` : `${h} 小时`;
}
