/**
 * 本地存储用量监控与清理工具
 *
 * 由于 Zustand persist 使用 localStorage（5-10MB 限制），
 * 当用户有多个大行程时可能触及上限。
 *
 * 本模块提供：
 * 1. 存储用量估算（按 key 统计字节数）
 * 2. 用量百分比提示
 * 3. 清理建议（找出最大的行程数据）
 *
 * 注意：完全迁移到 IndexedDB 会引入异步复杂性，
 * 当前方案优先提供可见性和清理能力。
 *
 * 兼容性：
 * - 使用 navigator.storage.estimate() 获取真实配额（Chrome/Firefox/Edge 支持）
 * - Safari（含 iOS）不支持时回退到 5MB 保守值
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
 * 获取 localStorage 的实际上限（优先使用 navigator.storage.estimate）
 *
 * navigator.storage.estimate() 返回的是 Origin 级别的总配额（通常数 GB），
 * 但 localStorage 实际受限于 5-10MB。我们取两者中较小的一个作为有效上限，
 * 避免给用户「还有很大空间」的错误印象。
 */
async function getStorageLimit(): Promise<number> {
  try {
    if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate();
      if (estimate?.quota) {
        // navigator.storage 返回的是 Origin 总配额（可能数 GB）
        // 但 localStorage 实际上限通常 5-10MB，取较小值
        return Math.min(estimate.quota, LOCALSTORAGE_FALLBACK_BYTES);
      }
    }
  } catch {
    // navigator.storage 不可用（旧浏览器/隐私模式），走兜底
  }
  return LOCALSTORAGE_FALLBACK_BYTES;
}

/**
 * 获取 localStorage 中 wanderlust 数据的用量（同步版本，使用保守上限）
 *
 * 适用于 useEffect 初始 state 和 SSR 安全场景。
 * 如需更精确的上限，使用 getStorageUsageAsync()。
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
 * 获取 localStorage 中 wanderlust 数据的用量（异步版本，使用真实配额）
 *
 * 适用于浏览器环境下的精确监控（如 useEffect 内定期刷新）。
 */
export async function getStorageUsageAsync(): Promise<StorageUsage> {
  try {
    const data = localStorage.getItem(STORAGE_KEY) ?? "";
    const usedBytes = new Blob([data]).size;
    const limitBytes = await getStorageLimit();
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

/** 单个行程的数据大小 */
export interface TripDataSize {
  tripId: string;
  tripTitle: string;
  /** 该行程相关数据的字节数 */
  bytes: number;
  /** 地点数 */
  placeCount: number;
  /** 支出数 */
  expenseCount: number;
  /** 笔记数 */
  noteCount: number;
  /** 打包项数 */
  packingCount: number;
}

/**
 * 分析每个行程的数据大小，用于清理建议
 */
export function getTripDataSizes(
  trips: { id: string; title: string }[],
  places: { tripId: string }[],
  expenses: { tripId: string }[],
  notes: { tripId: string; content: string }[],
  packingItems: { tripId: string }[]
): TripDataSize[] {
  return trips
    .map((trip) => {
      const tripPlaces = places.filter((p) => p.tripId === trip.id);
      const tripExpenses = expenses.filter((e) => e.tripId === trip.id);
      const tripNotes = notes.filter((n) => n.tripId === trip.id);
      const tripPacking = packingItems.filter((p) => p.tripId === trip.id);

      // 估算字节数：主要消耗来自笔记内容
      const notesBytes = tripNotes.reduce(
        (sum, n) => sum + new Blob([n.content ?? ""]).size,
        0
      );
      const otherBytes =
        (tripPlaces.length + tripExpenses.length + tripPacking.length) * 200; // 每条约 200 字节估算

      return {
        tripId: trip.id,
        tripTitle: trip.title,
        bytes: notesBytes + otherBytes,
        placeCount: tripPlaces.length,
        expenseCount: tripExpenses.length,
        noteCount: tripNotes.length,
        packingCount: tripPacking.length,
      };
    })
    .sort((a, b) => b.bytes - a.bytes);
}

/**
 * 格式化字节数为可读字符串
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
