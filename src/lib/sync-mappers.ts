/**
 * 云端同步的 snake_case ↔ camelCase 映射器
 *
 * 将本地领域模型（camelCase）与 Supabase 表行（snake_case）互相转换，
 * 供 push（本地 → 云端）和 pull（云端 → 本地）路径共享，避免重复映射逻辑。
 *
 * 说明：
 * - place_id 等跨表外键的"本地ID ↔ 云端ID"翻译需要上下文映射表，
 *   因此 rowToExpense / rowToNote 不包含 placeId，由调用方按映射表补齐；
 *   对称地，expenseToRow / noteToRow 接收调用方已解析好的 placeCloudId。
 * - 打包清单（packing_items）的字段命名两端一致，未纳入共享 mapper。
 */
import type {
  Trip,
  Place,
  Expense,
  Note,
  PlaceType,
  ExpenseCategory,
} from "@/types";

// ==================== 云端行（snake_case）类型 ====================

export interface TripRow {
  id?: string;
  user_id: string;
  title: string;
  description: string | null;
  destination: string;
  start_date: string;
  end_date: string;
  cover_image: string | null;
  status: Trip["status"];
  visibility: Trip["visibility"];
  base_currency: string;
  budget_limit: number | null;
  participants: string[];
  updated_at?: string;
}

export interface PlaceRow {
  id?: string;
  trip_id: string;
  day_index: number;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  type: PlaceType;
  stay_minutes: number | null;
  order: number;
  notes: string | null;
  rating: number | null;
  image_url: string | null;
  website_url: string | null;
}

export interface ExpenseRow {
  id?: string;
  trip_id: string;
  place_id: string | null;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  converted_amount: number | null;
  date: string;
  description: string | null;
  paid_by: string | null;
  split_among: string[];
}

export interface NoteRow {
  id?: string;
  trip_id: string;
  place_id: string | null;
  title: string;
  content: string;
}

/** pull 路径：云端返回的行必然带有 id */
export interface CloudTripRow extends TripRow {
  id: string;
  updated_at: string;
}
export interface CloudPlaceRow extends PlaceRow {
  id: string;
}
export interface CloudExpenseRow extends ExpenseRow {
  id: string;
}
export interface CloudNoteRow extends NoteRow {
  id: string;
}

// ==================== 本地 → 云端（camelCase → snake_case）====================

export function tripToRow(trip: Trip, userId: string): TripRow {
  return {
    ...(trip.cloudId ? { id: trip.cloudId } : {}),
    user_id: userId,
    title: trip.title,
    description: trip.description ?? null,
    destination: trip.destination,
    start_date: trip.startDate,
    end_date: trip.endDate,
    cover_image: trip.coverImage ?? null,
    status: trip.status,
    visibility: trip.visibility,
    base_currency: trip.baseCurrency,
    budget_limit: trip.budgetLimit ?? null,
    participants: trip.participants ?? [],
  };
}

export function placeToRow(place: Place, cloudTripId: string): PlaceRow {
  return {
    ...(place.cloudId ? { id: place.cloudId } : {}),
    trip_id: cloudTripId,
    day_index: place.dayIndex,
    name: place.name,
    address: place.address ?? null,
    lat: place.lat ?? null,
    lng: place.lng ?? null,
    type: place.type,
    stay_minutes: place.stayMinutes ?? null,
    order: place.order,
    notes: place.notes ?? null,
    rating: place.rating ?? null,
    image_url: place.imageUrl ?? null,
    website_url: place.websiteUrl ?? null,
  };
}

export function expenseToRow(
  expense: Expense,
  cloudTripId: string,
  placeCloudId?: string | null
): ExpenseRow {
  return {
    ...(expense.cloudId ? { id: expense.cloudId } : {}),
    trip_id: cloudTripId,
    place_id: placeCloudId ?? null,
    category: expense.category,
    amount: expense.amount,
    currency: expense.currency,
    converted_amount: expense.convertedAmount ?? null,
    date: expense.date,
    description: expense.description ?? null,
    paid_by: expense.paidBy ?? null,
    split_among: expense.splitAmong ?? [],
  };
}

export function noteToRow(
  note: Note,
  cloudTripId: string,
  placeCloudId?: string | null
): NoteRow {
  return {
    ...(note.cloudId ? { id: note.cloudId } : {}),
    trip_id: cloudTripId,
    place_id: placeCloudId ?? null,
    title: note.title,
    content: note.content,
  };
}

// ==================== 云端 → 本地（snake_case → camelCase）====================

export function rowToTrip(row: CloudTripRow): Partial<Trip> {
  return {
    title: row.title,
    description: row.description ?? undefined,
    destination: row.destination,
    startDate: row.start_date,
    endDate: row.end_date,
    coverImage: row.cover_image ?? undefined,
    status: row.status,
    visibility: row.visibility,
    baseCurrency: row.base_currency,
    budgetLimit: row.budget_limit ?? undefined,
    participants: Array.isArray(row.participants) ? row.participants : undefined,
    updatedAt: row.updated_at,
  };
}

export function rowToPlace(row: CloudPlaceRow): Partial<Place> {
  return {
    cloudId: row.id,
    dayIndex: row.day_index,
    name: row.name,
    address: row.address ?? undefined,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    type: row.type,
    stayMinutes: row.stay_minutes ?? undefined,
    order: row.order,
    notes: row.notes ?? undefined,
    rating: row.rating ?? undefined,
    imageUrl: row.image_url ?? undefined,
    websiteUrl: row.website_url ?? undefined,
  };
}

export function rowToExpense(row: CloudExpenseRow): Partial<Expense> {
  return {
    cloudId: row.id,
    category: row.category,
    amount: Number(row.amount),
    currency: row.currency,
    convertedAmount: row.converted_amount ? Number(row.converted_amount) : undefined,
    date: row.date,
    description: row.description ?? undefined,
    paidBy: row.paid_by ?? undefined,
    splitAmong: Array.isArray(row.split_among) ? row.split_among : undefined,
  };
}

export function rowToNote(row: CloudNoteRow): Partial<Note> {
  return {
    cloudId: row.id,
    title: row.title,
    content: row.content,
  };
}
