/**
 * 行程导出/导入服务
 *
 * 导出格式：JSON，包含行程元数据 + 所有子数据（地点/支出/笔记/打包清单）
 * 导入时生成新的本地 ID，通过 _exportId 字段重建 placeId 引用映射
 */

import { useTripStore } from "@/stores/trip-store";
import { toast } from "@/components/ui/toast";
import type {
  Trip,
  Place,
  Expense,
  Note,
  PackingItem,
  TripStatus,
  Visibility,
  PlaceType,
  ExpenseCategory,
  PackingCategory,
} from "@/types";

const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
const TRIP_STATUSES = new Set<TripStatus>(["planning", "ongoing", "completed", "archived"]);
const VISIBILITIES = new Set<Visibility>(["private", "public", "friends"]);
const PLACE_TYPES = new Set<PlaceType>([
  "attraction",
  "restaurant",
  "hotel",
  "transport",
  "shopping",
  "other",
]);
const EXPENSE_CATEGORIES = new Set<ExpenseCategory>([
  "transport",
  "accommodation",
  "food",
  "ticket",
  "shopping",
  "other",
]);
const PACKING_CATEGORIES = new Set<PackingCategory>([
  "essentials",
  "clothing",
  "toiletries",
  "electronics",
  "documents",
  "miscellaneous",
]);

/** 导出数据结构（含 _exportId 用于重建 placeId 引用） */
interface TripExportData {
  version: 2 | 3;
  exportedAt: string;
  trip: Omit<Trip, "id" | "userId" | "cloudId">;
  places: (Omit<Place, "id" | "tripId" | "cloudId"> & { _exportId: string })[];
  expenses: (Omit<Expense, "id" | "tripId" | "cloudId"> & {
    _placeExportId?: string;
  })[];
  notes: (Omit<Note, "id" | "tripId" | "cloudId"> & {
    _placeExportId?: string;
  })[];
  packingItems?: Omit<PackingItem, "id" | "tripId" | "cloudId">[];
}

interface ImportedTrip {
  title: string;
  description?: string;
  destination: string;
  startDate: string;
  endDate: string;
  coverImage?: string;
  status: TripStatus;
  visibility: Visibility;
  baseCurrency: string;
  budgetLimit?: number;
  participants?: string[];
}

interface ImportedPlace {
  exportId: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  type: PlaceType;
  dayIndex: number;
  order: number;
  stayMinutes?: number;
  notes?: string;
  rating?: number;
  imageUrl?: string;
  websiteUrl?: string;
}

interface ImportedExpense {
  placeExportId?: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  convertedAmount?: number;
  date: string;
  description?: string;
  paidBy?: string;
  splitAmong?: string[];
}

interface ImportedNote {
  placeExportId?: string;
  title: string;
  content: string;
}

interface ImportedPackingItem {
  name: string;
  category: PackingCategory;
  packed: boolean;
  quantity: number;
  suggested: boolean;
  notes?: string;
}

export interface ParsedTripBackup {
  trip: ImportedTrip;
  places: ImportedPlace[];
  expenses: ImportedExpense[];
  notes: ImportedNote[];
  packingItems: ImportedPackingItem[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

// 字段长度上限：防止恶意/损坏的备份文件注入超大字符串，耗尽内存或撑爆本地存储。
const MAX_NOTE_CONTENT_CHARS = 100_000;
const MAX_URL_CHARS = 2_048;
const MAX_DESCRIPTION_CHARS = 5_000;
const MAX_NOTE_TITLE_CHARS = 500;

/** 校验字符串并限制最大长度；超长时截断，非字符串返回 undefined。 */
function boundedString(value: string, maxLen: number): string;
function boundedString(value: unknown, maxLen: number): string | undefined;
function boundedString(value: unknown, maxLen: number): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.length > maxLen ? value.slice(0, maxLen) : value;
}

function nonNegativeNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function nonNegativeInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  // 用 UTC 校验，避免 parseISO 在本地时区午夜转 UTC 时把日期往前挪一天
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

function stringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return Array.from(new Set(value.map(nonEmptyString).filter((item): item is string => Boolean(item))));
}

function stringValue<T extends string>(value: unknown, allowed: Set<T>): T | undefined {
  return typeof value === "string" && allowed.has(value as T) ? (value as T) : undefined;
}

/**
 * Parse an exported file into a safe, schema-checked payload.
 * Invalid child records are skipped so a single damaged item cannot corrupt the whole restore.
 */
export function parseTripBackup(text: string): ParsedTripBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("备份文件不是有效的 JSON");
  }

  if (!isRecord(raw) || (raw.version !== 2 && raw.version !== 3) || !isRecord(raw.trip)) {
    throw new Error("不支持或无效的行程备份文件");
  }

  const title = nonEmptyString(raw.trip.title);
  const destination = nonEmptyString(raw.trip.destination);
  if (!title || !destination) throw new Error("备份文件缺少行程名称或目的地");

  const today = new Date().toISOString().slice(0, 10);
  const startDate = validDate(raw.trip.startDate) ? raw.trip.startDate : today;
  const endDate = validDate(raw.trip.endDate) ? raw.trip.endDate : startDate;

  const trip: ImportedTrip = {
    title,
    destination,
    startDate,
    endDate,
    description: boundedString(raw.trip.description, MAX_DESCRIPTION_CHARS),
    coverImage: boundedString(raw.trip.coverImage, MAX_URL_CHARS),
    status: stringValue(raw.trip.status, TRIP_STATUSES) ?? "planning",
    visibility: stringValue(raw.trip.visibility, VISIBILITIES) ?? "private",
    baseCurrency: nonEmptyString(raw.trip.baseCurrency) ?? "CNY",
    budgetLimit: nonNegativeNumber(raw.trip.budgetLimit),
    participants: stringList(raw.trip.participants),
  };

  const places: ImportedPlace[] = [];
  if (Array.isArray(raw.places)) {
    raw.places.forEach((value, index) => {
      if (!isRecord(value)) return;
      const name = nonEmptyString(value.name);
      const type = stringValue(value.type, PLACE_TYPES);
      const dayIndex = nonNegativeInteger(value.dayIndex);
      const order = nonNegativeInteger(value.order);
      const hasLat = value.lat !== undefined;
      const hasLng = value.lng !== undefined;
      const lat = finiteNumber(value.lat);
      const lng = finiteNumber(value.lng);
      if (!name || !type || dayIndex === undefined || order === undefined) return;
      if (hasLat !== hasLng || (hasLat && (lat === undefined || lng === undefined))) return;
      if (lat !== undefined && lng !== undefined && (lat < -90 || lat > 90 || lng < -180 || lng > 180)) return;

      places.push({
        exportId: nonEmptyString(value._exportId) ?? `imported-place-${index}`,
        name,
        type,
        dayIndex,
        order,
        lat,
        lng,
        address: optionalString(value.address),
        stayMinutes: nonNegativeInteger(value.stayMinutes),
        notes: optionalString(value.notes),
        rating: typeof value.rating === "number" && Number.isInteger(value.rating) && value.rating >= 1 && value.rating <= 5 ? value.rating : undefined,
        imageUrl: boundedString(value.imageUrl, MAX_URL_CHARS),
        websiteUrl: boundedString(value.websiteUrl, MAX_URL_CHARS),
      });
    });
  }

  const expenses: ImportedExpense[] = [];
  if (Array.isArray(raw.expenses)) {
    raw.expenses.forEach((value) => {
      if (!isRecord(value)) return;
      const category = stringValue(value.category, EXPENSE_CATEGORIES);
      const amount = nonNegativeNumber(value.amount);
      const currency = nonEmptyString(value.currency);
      if (!category || amount === undefined || !currency || !validDate(value.date)) return;
      expenses.push({
        category,
        amount,
        currency,
        date: value.date,
        placeExportId: nonEmptyString(value._placeExportId),
        convertedAmount: nonNegativeNumber(value.convertedAmount),
        description: boundedString(value.description, MAX_DESCRIPTION_CHARS),
        paidBy: optionalString(value.paidBy),
        splitAmong: stringList(value.splitAmong),
      });
    });
  }

  const notes: ImportedNote[] = [];
  if (Array.isArray(raw.notes)) {
    raw.notes.forEach((value) => {
      if (!isRecord(value)) return;
      const title = nonEmptyString(value.title);
      const content = boundedString(value.content, MAX_NOTE_CONTENT_CHARS);
      if (!title || content === undefined) return;
      notes.push({
        title: boundedString(title, MAX_NOTE_TITLE_CHARS),
        content,
        placeExportId: nonEmptyString(value._placeExportId),
      });
    });
  }

  const packingItems: ImportedPackingItem[] = [];
  if (Array.isArray(raw.packingItems)) {
    raw.packingItems.forEach((value) => {
      if (!isRecord(value)) return;
      const name = nonEmptyString(value.name);
      const category = stringValue(value.category, PACKING_CATEGORIES);
      const quantity = nonNegativeInteger(value.quantity);
      if (!name || !category || quantity === undefined || quantity < 1) return;
      packingItems.push({
        name,
        category,
        quantity,
        packed: value.packed === true,
        suggested: value.suggested === true,
        notes: optionalString(value.notes),
      });
    });
  }

  return { trip, places, expenses, notes, packingItems };
}

/**
 * 将行程导出为 JSON 文件并触发下载
 */
export function exportTripToJSON(tripId: string): void {
  const store = useTripStore.getState();
  const trip = store.getTripById(tripId);
  if (!trip) {
    toast.error("行程不存在", "无法导出不存在的行程");
    return;
  }
  // SSR 守卫：在非浏览器环境（如服务端渲染）下直接返回，避免访问 document
  if (typeof document === "undefined") return;

  const places = store.getPlacesByTrip(tripId);
  const expenses = store.getExpensesByTrip(tripId);
  const notes = store.getNotesByTrip(tripId);
  const packingItems = store.getPackingItemsByTrip(tripId);

  // 显式序列化可移植字段：不导出本地 ID、用户 ID 或云端 ID。
  const exportData: TripExportData = {
    version: 3,
    exportedAt: new Date().toISOString(),
    trip: {
      title: trip.title,
      description: trip.description,
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
      coverImage: trip.coverImage,
      status: trip.status,
      visibility: trip.visibility,
      baseCurrency: trip.baseCurrency,
      budgetLimit: trip.budgetLimit,
      participants: trip.participants,
      createdAt: trip.createdAt,
      updatedAt: trip.updatedAt,
    },
    places: places.map((place) => ({
      _exportId: place.id,
      name: place.name,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
      type: place.type,
      dayIndex: place.dayIndex,
      order: place.order,
      stayMinutes: place.stayMinutes,
      notes: place.notes,
      rating: place.rating,
      imageUrl: place.imageUrl,
      websiteUrl: place.websiteUrl,
    })),
    expenses: expenses.map((expense) => ({
      _placeExportId: expense.placeId,
      category: expense.category,
      amount: expense.amount,
      currency: expense.currency,
      convertedAmount: expense.convertedAmount,
      date: expense.date,
      description: expense.description,
      paidBy: expense.paidBy,
      splitAmong: expense.splitAmong,
    })),
    notes: notes.map((note) => ({
      _placeExportId: note.placeId,
      title: note.title,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    })),
    packingItems: packingItems.map((item) => ({
      name: item.name,
      category: item.category,
      packed: item.packed,
      quantity: item.quantity,
      suggested: item.suggested,
      notes: item.notes,
    })),
  };

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  // 文件名：行程标题_日期.json
  const dateStr = new Date().toISOString().slice(0, 10);
  const safeTitle = trip.title.replace(/[<>:"/\\|?*]/g, "_");
  a.download = `${safeTitle}_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 从 JSON 文件导入行程
 * @returns 新创建的行程 ID
 */
export async function importTripFromJSON(file: File): Promise<string> {
  if (file.size > MAX_BACKUP_BYTES) {
    throw new Error("备份文件超过 5 MB 限制，请拆分或清理后再导入");
  }
  const text = await file.text();
  const data = parseTripBackup(text);

  const store = useTripStore.getState();

  // 创建新行程（生成新的本地 ID）——仅使用已校验的字段，避免不可信字段进入 store。
  const newTrip = store.addTrip({
    userId: "local",
    title: data.trip.title,
    description: data.trip.description,
    destination: data.trip.destination,
    startDate: data.trip.startDate,
    endDate: data.trip.endDate,
    coverImage: data.trip.coverImage,
    status: data.trip.status,
    visibility: data.trip.visibility,
    baseCurrency: data.trip.baseCurrency,
    budgetLimit: data.trip.budgetLimit,
    participants: data.trip.participants,
  });

  // 导入地点，记录 _exportId → newId 映射（供支出/笔记引用）
  const exportIdToNewId = new Map<string, string>();
  data.places.forEach((place) => {
    const newPlace = store.addPlace({
      tripId: newTrip.id,
      name: place.name,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
      type: place.type,
      dayIndex: place.dayIndex,
      order: place.order,
      stayMinutes: place.stayMinutes,
      notes: place.notes,
      rating: place.rating,
      imageUrl: place.imageUrl,
      websiteUrl: place.websiteUrl,
    });
    exportIdToNewId.set(place.exportId, newPlace.id);
  });

  // 导入支出，用 _placeExportId 映射重建 placeId
  data.expenses.forEach((expense) => {
    store.addExpense({
      tripId: newTrip.id,
      category: expense.category,
      amount: expense.amount,
      currency: expense.currency,
      convertedAmount: expense.convertedAmount,
      date: expense.date,
      description: expense.description,
      paidBy: expense.paidBy,
      splitAmong: expense.splitAmong,
      placeId: expense.placeExportId
        ? exportIdToNewId.get(expense.placeExportId) ?? undefined
        : undefined,
    });
  });

  // 导入笔记，用 _placeExportId 映射重建 placeId
  data.notes.forEach((note) => {
    store.addNote({
      tripId: newTrip.id,
      title: note.title,
      content: note.content,
      placeId: note.placeExportId
        ? exportIdToNewId.get(note.placeExportId) ?? undefined
        : undefined,
    });
  });

  data.packingItems.forEach((item) => {
    store.addPackingItem({
      tripId: newTrip.id,
      name: item.name,
      category: item.category,
      packed: item.packed,
      quantity: item.quantity,
      suggested: item.suggested,
      notes: item.notes,
    });
  });

  return newTrip.id;
}
