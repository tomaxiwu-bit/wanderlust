/**
 * 行程分享工具
 *
 * 灵感来源：Visited / Wanderlog 的行程分享功能
 *
 * 实现：将行程数据编码为 URL 安全的 base64 字符串
 * 生成可分享的只读链接，无需后端
 *
 * 注意：URL 长度有限制（~2000 字符安全），
 * 对于大型行程建议使用导出 JSON 文件分享
 */

import type { Trip, Place, Expense, Note } from "@/types";

const MAX_SHARE_LENGTH = 20_000;
const PLACE_TYPES = new Set<Place["type"]>([
  "attraction",
  "restaurant",
  "hotel",
  "transport",
  "shopping",
  "other",
]);
const EXPENSE_CATEGORIES = new Set<Expense["category"]>([
  "transport",
  "accommodation",
  "food",
  "ticket",
  "shopping",
  "other",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isOptionalFiniteNumber(value: unknown): value is number | undefined {
  return value === undefined || (typeof value === "number" && Number.isFinite(value));
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function isValidCoordinate(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function isISODate(value: unknown): value is string {
  if (!isNonEmptyString(value) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** 分享数据结构 */
export interface ShareableTrip {
  trip: Trip;
  places: Place[];
  expenses: Expense[];
  notes: Note[];
}

/**
 * UTF-8 安全的 base64 编码（替代已弃用的 unescape/escape 方案）
 *
 * 使用 TextEncoder / TextDecoder 处理 UTF-8 字节流，
 * 避免弃用 API，并正确处理中文等多字节字符。
 */
function encodeBase64Utf8(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decodeBase64Utf8(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * 将行程数据编码为 URL 安全字符串
 * 使用 base64 编码 + URL 安全替换
 */
export function encodeTripToShare(data: ShareableTrip): string {
  // 只保留必要字段，减小体积
  const compact = {
    t: {
      title: data.trip.title,
      destination: data.trip.destination,
      startDate: data.trip.startDate,
      endDate: data.trip.endDate,
      baseCurrency: data.trip.baseCurrency,
      description: data.trip.description,
      participants: data.trip.participants,
    },
    p: data.places.map((p) => ({
      n: p.name,
      t: p.type,
      d: p.dayIndex,
      o: p.order,
      la: p.lat,
      ln: p.lng,
      s: p.stayMinutes,
      a: p.address,
      no: p.notes,
    })),
    e: data.expenses.map((e) => ({
      c: e.category,
      a: e.amount,
      cu: e.currency,
      d: e.date,
      de: e.description,
      pb: e.paidBy,
      sa: e.splitAmong,
    })),
    // 笔记体积较大，只分享标题
    no: data.notes.map((n) => ({ t: n.title })),
  };

  const json = JSON.stringify(compact);
  // base64 编码 + URL 安全
  const base64 = encodeBase64Utf8(json);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * 从 URL 安全字符串解码行程数据
 */
export function decodeTripFromShare(encoded: string): ShareableTrip | null {
  try {
    if (!encoded || encoded.length > MAX_SHARE_LENGTH) return null;

    // URL 安全 base64 还原
    let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) base64 += "=";

    const json = decodeBase64Utf8(base64);
    const compact: unknown = JSON.parse(json);
    if (!isRecord(compact) || !isRecord(compact.t)) return null;

    const tripData = compact.t;
    if (
      !isNonEmptyString(tripData.title) ||
      !isNonEmptyString(tripData.destination) ||
      !isISODate(tripData.startDate) ||
      !isISODate(tripData.endDate) ||
      !isOptionalString(tripData.baseCurrency) ||
      !isOptionalString(tripData.description) ||
      (tripData.participants !== undefined &&
        (!Array.isArray(tripData.participants) || !tripData.participants.every(isNonEmptyString))) ||
      (compact.p !== undefined && !Array.isArray(compact.p)) ||
      (compact.e !== undefined && !Array.isArray(compact.e)) ||
      (compact.no !== undefined && !Array.isArray(compact.no))
    ) {
      return null;
    }

    const places: Place[] = [];
    for (const [idx, rawPlace] of (compact.p ?? []).entries()) {
      if (!isRecord(rawPlace)) return null;
      const lat = rawPlace.la;
      const lng = rawPlace.ln;
      if (
        !isNonEmptyString(rawPlace.n) ||
        typeof rawPlace.t !== "string" ||
        !PLACE_TYPES.has(rawPlace.t as Place["type"]) ||
        !isInteger(rawPlace.d) ||
        !isInteger(rawPlace.o) ||
        !isOptionalFiniteNumber(lat) ||
        !isOptionalFiniteNumber(lng) ||
        !isOptionalFiniteNumber(rawPlace.s) ||
        !isOptionalString(rawPlace.a) ||
        !isOptionalString(rawPlace.no) ||
        (lat === undefined) !== (lng === undefined) ||
        (lat !== undefined && lng !== undefined && !isValidCoordinate(lat, lng))
      ) {
        return null;
      }
      places.push({
        id: `shared-place-${idx}`,
        tripId: "shared",
        name: rawPlace.n,
        type: rawPlace.t as Place["type"],
        dayIndex: rawPlace.d,
        order: rawPlace.o,
        lat,
        lng,
        stayMinutes: rawPlace.s,
        address: rawPlace.a,
        notes: rawPlace.no,
      });
    }

    const expenses: Expense[] = [];
    for (const [idx, rawExpense] of (compact.e ?? []).entries()) {
      if (!isRecord(rawExpense)) return null;
      const splitAmong = rawExpense.sa;
      if (
        typeof rawExpense.c !== "string" ||
        !EXPENSE_CATEGORIES.has(rawExpense.c as Expense["category"]) ||
        !isOptionalFiniteNumber(rawExpense.a) ||
        !isNonEmptyString(rawExpense.cu) ||
        !isISODate(rawExpense.d) ||
        !isOptionalString(rawExpense.de) ||
        !isOptionalString(rawExpense.pb) ||
        (splitAmong !== undefined && (!Array.isArray(splitAmong) || !splitAmong.every(isNonEmptyString)))
      ) {
        return null;
      }
      expenses.push({
        id: `shared-expense-${idx}`,
        tripId: "shared",
        category: rawExpense.c as Expense["category"],
        amount: rawExpense.a ?? 0,
        currency: rawExpense.cu,
        date: rawExpense.d,
        description: rawExpense.de,
        paidBy: rawExpense.pb,
        splitAmong: splitAmong as string[] | undefined,
      });
    }

    const notes: Note[] = [];
    for (const [idx, rawNote] of (compact.no ?? []).entries()) {
      if (!isRecord(rawNote) || !isNonEmptyString(rawNote.t)) return null;
      notes.push({
        id: `shared-note-${idx}`,
        tripId: "shared",
        title: rawNote.t,
        content: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return {
      trip: {
        id: "shared",
        userId: "shared",
        title: tripData.title,
        destination: tripData.destination,
        startDate: tripData.startDate,
        endDate: tripData.endDate,
        baseCurrency: tripData.baseCurrency ?? "CNY",
        description: tripData.description,
        participants: tripData.participants as string[] | undefined,
        status: "planning",
        visibility: "public",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      places,
      expenses,
      notes,
    };
  } catch {
    return null;
  }
}

/**
 * 生成分享链接
 */
export function generateShareUrl(data: ShareableTrip): string {
  const encoded = encodeTripToShare(data);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  return `${baseUrl}/share/${encoded}`;
}

/**
 * 检查分享数据大小是否安全
 */
export function checkShareSize(data: ShareableTrip): { safe: boolean; size: number; maxSafe: number } {
  const encoded = encodeTripToShare(data);
  return {
    safe: encoded.length < 2000,
    size: encoded.length,
    maxSafe: 2000,
  };
}
