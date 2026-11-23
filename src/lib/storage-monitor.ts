/**
 * 本地存储用量监控与清理工具
 *
 * 由于 Zustand persist 使用 localStorage（5-10MB 限制），
 * 当用户有多个大行程时可能触及上限。
 *
 * 本模块提供：
 * 1. 存储用量估算（按 key 统计字节数）
 * 2. 用量百分比提示
 * 3. 接近上限时给出清理提示
 *
 * 注意：完全迁移到 IndexedDB 会引入异步复杂性，
 * 当前方案优先提供可见性和清理能力。
 *
 * 兼容性：
 * - 隐私模式下 localStorage 可能完全不可用，函数会返回零用量
 */

/** 存储键名 */
const STORAGE_KEY = "wanderlust-storage";

/** localStorage 的保守上限（字节），作为 navigator.storage 不可用时的兜底 */
const LOCALSTORAGE_FALLBACK_BYTES = 5 * 1024 * 1024; // 5MB

/** 存储用量信息 */
export interface StorageUsage {
  /** 已用字节数 */
  usedBytes: number;
  /** 上限字节数 */
  limitBytes: number;
  /** 使用百分比 */
  percent: number;
  /** 是否接近上限（>80%） */
  nearLimit: boolean;
  /** 是否已超限 */
  overLimit: boolean;
}

/**
 * 获取 localStorage 中 wanderlust 数据的用量。
 * 使用保守的 5MB 上限；Origin 总配额不能代表 localStorage 配额。
 */
export function getStorageUsage(): StorageUsage {
  try {
    const data = localStorage.getItem(STORAGE_KEY) ?? "";
    const usedBytes = new Blob([data]).size;
    const limitBytes = LOCALSTORAGE_FALLBACK_BYTES;
    const percent = Math.round((usedBytes / limitBytes) * 100);
    return {
      usedBytes,
      limitBytes,
      percent,
      nearLimit: percent >= 80,
      overLimit: percent >= 100,
    };
  } catch {
    return {
      usedBytes: 0,
      limitBytes: LOCALSTORAGE_FALLBACK_BYTES,
      percent: 0,
      nearLimit: false,
      overLimit: false,
    };
  }
}

/**
 * 格式化字节数为可读字符串
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
