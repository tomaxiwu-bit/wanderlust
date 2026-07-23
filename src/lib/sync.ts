/**
 * 云端同步服务
 *
 * 同步模型：本地优先 + 按需推送/拉取
 * - pushTripToCloud: 将单个本地行程（含子数据）upsert 到云端，回写 cloudId
 * - pullCloudTrips: 拉取用户的所有云端行程，按 cloudId 合并到本地
 * - syncAll: 先推送全部本地行程，再拉取云端行程（全量同步）
 *
 * 已知限制（portfolio 项目可接受）：
 * - 不支持双向冲突合并，云端较新时以云端覆盖本地
 * - 本地删除不会自动同步到云端（需调用 deleteTripFromCloud）
 * - 跨设备独立创建的相同行程会产生重复（按 cloudId 匹配，无 cloudId 视为不同行程）
 */

import { supabase } from "./supabase";
import { useTripStore } from "@/stores/trip-store";
import {
  tripToRow,
  placeToRow,
  expenseToRow,
  noteToRow,
  rowToTrip,
  rowToPlace,
  rowToExpense,
  rowToNote,
} from "./sync-mappers";
import type { Trip, Place, Expense, Note, PackingItem } from "@/types";

export interface SyncResult {
  pushed: number;
  pulled: number;
  errors: string[];
}

// ==================== 推送（本地 → 云端）====================

/**
 * 将单个行程及其子数据 upsert 到云端，并把 cloudId 回写到本地。
 * 若行程已有 cloudId 则更新，否则新增（由数据库生成 UUID）。
 */
export async function pushTripToCloud(
  tripId: string,
  userId: string
): Promise<void> {
  if (!supabase) throw new Error("Supabase 未配置");

  const store = useTripStore.getState();
  const trip = store.getTripById(tripId);
  if (!trip) throw new Error("行程不存在");

  const places = store.getPlacesByTrip(tripId);
  const expenses = store.getExpensesByTrip(tripId);
  const notes = store.getNotesByTrip(tripId);
  const packingItems = store.getPackingItemsByTrip(tripId);

  // 1. Upsert 行程
  const tripRow = tripToRow(trip, userId);
  const { data: tripData, error: tripError } = await supabase
    .from("trips")
    .upsert(tripRow)
    .select("id")
    .single();
  if (tripError) throw new Error(`同步行程失败: ${tripError.message}`);

  const cloudTripId = tripData.id;
  // 回写 cloudId 和 userId（之前可能是 "local"）
  store.updateTrip(tripId, { cloudId: cloudTripId, userId });

  // 2. Upsert 地点，记录 localId → cloudId 映射（供支出/笔记引用）
  const placeIdMap = new Map<string, string>();
  for (const place of places) {
    const placeRow = placeToRow(place, cloudTripId);
    const { data, error } = await supabase
      .from("places")
      .upsert(placeRow)
      .select("id")
      .single();
    if (error) throw new Error(`同步地点"${place.name}"失败: ${error.message}`);
    placeIdMap.set(place.id, data.id);
    store.updatePlace(place.id, { cloudId: data.id });
  }

  // 3. Upsert 支出
  for (const expense of expenses) {
    const placeCloudId = expense.placeId
      ? placeIdMap.get(expense.placeId) ?? null
      : null;
    const expenseRow = expenseToRow(expense, cloudTripId, placeCloudId);
    const { data, error } = await supabase
      .from("expenses")
      .upsert(expenseRow)
      .select("id")
      .single();
    if (error) throw new Error(`同步支出失败: ${error.message}`);
    store.updateExpense(expense.id, { cloudId: data.id });
  }

  // 4. Upsert 笔记
  for (const note of notes) {
    const placeCloudId = note.placeId
      ? placeIdMap.get(note.placeId) ?? null
      : null;
    const noteRow = noteToRow(note, cloudTripId, placeCloudId);
    const { data, error } = await supabase
      .from("notes")
      .upsert(noteRow)
      .select("id")
      .single();
    if (error) throw new Error(`同步笔记"${note.title}"失败: ${error.message}`);
    store.updateNote(note.id, { cloudId: data.id });
  }

  // 5. Upsert 打包清单（两端字段命名一致，未纳入共享 mapper）
  for (const item of packingItems) {
    const itemRow = {
      ...(item.cloudId ? { id: item.cloudId } : {}),
      trip_id: cloudTripId,
      name: item.name,
      category: item.category,
      packed: item.packed,
      quantity: item.quantity,
      suggested: item.suggested,
      notes: item.notes ?? null,
    };
    const { data, error } = await supabase
      .from("packing_items")
      .upsert(itemRow)
      .select("id")
      .single();
    if (error) throw new Error(`同步打包物品\"${item.name}\"失败: ${error.message}`);
    store.updatePackingItem(item.id, { cloudId: data.id });
  }
}

// ==================== 拉取（云端 → 本地）====================

/**
 * 拉取用户在云端的所有行程并合并到本地。
 * - 已有 cloudId 匹配的行程：若云端 updated_at 更新则覆盖本地（含子数据）
 * - 无匹配的云端行程：创建本地副本（含子数据）
 * @returns 新增/更新的行程数
 */
export async function pullCloudTrips(userId: string): Promise<number> {
  if (!supabase) throw new Error("Supabase 未配置");
  const store = useTripStore.getState();

  const { data: cloudTrips, error } = await supabase
    .from("trips")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`拉取行程失败: ${error.message}`);

  let pulled = 0;
  for (const ct of cloudTrips ?? []) {
    const existing = store.trips.find((t) => t.cloudId === ct.id);
    if (existing) {
      // 已在本地：仅当云端更新时间严格大于本地时才覆盖
      const cloudUpdated = new Date(ct.updated_at).getTime();
      const localUpdated = new Date(existing.updatedAt).getTime();
      // 2 秒容差，避免推送后立刻拉取造成的无意义覆盖
      // 任一日期无效时，保守地执行更新（避免漏更）
      const shouldUpdate = isNaN(cloudUpdated) || isNaN(localUpdated) || cloudUpdated > localUpdated + 2000;
      if (shouldUpdate) {
        store.updateTrip(existing.id, rowToTrip(ct));
        await replaceLocalChildren(existing.id, ct.id);
        pulled++;
      }
    } else {
      // 新的云端行程：创建本地副本
      // rowToTrip 返回 Partial<Trip>（字段可选），addTrip 需要必填字段；
      // 此处将映射结果断言为 addTrip 所需的输入类型（云端行字段完备，运行时安全）。
      // rowToTrip 不产生 userId，故从断言类型中一并排除，避免与显式 userId 冲突。
      const newTrip = store.addTrip({
        userId,
        cloudId: ct.id,
        ...(rowToTrip(ct) as Omit<Trip, "id" | "createdAt" | "updatedAt" | "userId">),
      });
      await replaceLocalChildren(newTrip.id, ct.id);
      pulled++;
    }
  }
  return pulled;
}

/**
 * 用云端子数据替换某个本地行程的子数据（places/expenses/notes/packingItems）。
 *
 * 原子性策略（先写后删）：
 * - 先并行拉取云端 places/expenses/notes/packingItems 到内存（不修改本地状态）
 * - 任一拉取失败则保留本地数据不变，避免数据丢失
 * - 写入阶段：对每个云端子项，若本地存在同 cloudId 则 update，否则 add（先写入）
 * - 清理阶段：全部写入成功后，删除本地有 cloudId 但云端已不存在的旧数据（后删除）
 * - 本地无 cloudId 的子项（尚未推送的本地新增）保留，不误删
 *
 * 相比"先清空再重建"，写入失败时本地仍保留旧数据，不会出现空窗或数据丢失。
 */
async function replaceLocalChildren(
  localTripId: string,
  cloudTripId: string
): Promise<void> {
  if (!supabase) return;
  const store = useTripStore.getState();

  // 1. 先并行拉取云端子数据（不修改本地状态）
  const [placesResult, expensesResult, notesResult, packingItemsResult] = await Promise.all([
    supabase
      .from("places")
      .select("*")
      .eq("trip_id", cloudTripId)
      .order("day_index", { ascending: true })
      .order("order", { ascending: true }),
    supabase.from("expenses").select("*").eq("trip_id", cloudTripId),
    supabase.from("notes").select("*").eq("trip_id", cloudTripId),
    supabase.from("packing_items").select("*").eq("trip_id", cloudTripId),
  ]);

  // 任一查询出错，保留本地数据不变
  if (
    placesResult.error ||
    expensesResult.error ||
    notesResult.error ||
    packingItemsResult.error
  ) {
    console.error("[Sync] 拉取子数据失败，保留本地数据:", {
      places: placesResult.error?.message,
      expenses: expensesResult.error?.message,
      notes: notesResult.error?.message,
      packingItems: packingItemsResult.error?.message,
    });
    return;
  }

  const cloudPlaces = placesResult.data ?? [];
  const cloudExpenses = expensesResult.data ?? [];
  const cloudNotes = notesResult.data ?? [];
  const cloudPackingItems = packingItemsResult.data ?? [];

  // 2. 写入阶段：先 upsert 云端数据到本地（按 cloudId 匹配：存在则 update，否则 add）

  // --- places ---
  const localPlaces = store.places.filter((p) => p.tripId === localTripId);
  const localPlaceByCloudId = new Map<string, string>(); // cloudId → localId
  for (const lp of localPlaces) {
    if (lp.cloudId) localPlaceByCloudId.set(lp.cloudId, lp.id);
  }
  const cloudPlaceIds = new Set<string>();
  const placeCloudToLocal = new Map<string, string>(); // cloudId → localId（供 expense/note 引用）
  for (const cp of cloudPlaces) {
    const existingId = localPlaceByCloudId.get(cp.id);
    const placeData = rowToPlace(cp);
    if (existingId) {
      store.updatePlace(existingId, placeData);
      placeCloudToLocal.set(cp.id, existingId);
    } else {
      const np = store.addPlace({
        tripId: localTripId,
        ...placeData,
      } as Omit<Place, "id">);
      placeCloudToLocal.set(cp.id, np.id);
    }
    cloudPlaceIds.add(cp.id);
  }

  // --- expenses ---
  const localExpenses = store.expenses.filter((e) => e.tripId === localTripId);
  const localExpenseByCloudId = new Map<string, string>();
  for (const le of localExpenses) {
    if (le.cloudId) localExpenseByCloudId.set(le.cloudId, le.id);
  }
  const cloudExpenseIds = new Set<string>();
  for (const ce of cloudExpenses) {
    const placeId = ce.place_id
      ? placeCloudToLocal.get(ce.place_id) ?? undefined
      : undefined;
    const existingId = localExpenseByCloudId.get(ce.id);
    const expenseData: Partial<Expense> = { ...rowToExpense(ce), placeId };
    if (existingId) {
      store.updateExpense(existingId, expenseData);
    } else {
      store.addExpense({
        tripId: localTripId,
        ...expenseData,
      } as Omit<Expense, "id">);
    }
    cloudExpenseIds.add(ce.id);
  }

  // --- notes ---
  const localNotes = store.notes.filter((n) => n.tripId === localTripId);
  const localNoteByCloudId = new Map<string, string>();
  for (const ln of localNotes) {
    if (ln.cloudId) localNoteByCloudId.set(ln.cloudId, ln.id);
  }
  const cloudNoteIds = new Set<string>();
  for (const cn of cloudNotes) {
    const placeId = cn.place_id
      ? placeCloudToLocal.get(cn.place_id) ?? undefined
      : undefined;
    const existingId = localNoteByCloudId.get(cn.id);
    const noteData: Partial<Note> = { ...rowToNote(cn), placeId };
    if (existingId) {
      store.updateNote(existingId, noteData);
    } else {
      store.addNote({
        tripId: localTripId,
        ...noteData,
      } as Omit<Note, "id" | "createdAt" | "updatedAt">);
    }
    cloudNoteIds.add(cn.id);
  }

  // --- packing items（两端字段命名一致，未纳入共享 mapper）---
  const localPackingItems = store.packingItems.filter((i) => i.tripId === localTripId);
  const localPackingByCloudId = new Map<string, string>();
  for (const li of localPackingItems) {
    if (li.cloudId) localPackingByCloudId.set(li.cloudId, li.id);
  }
  const cloudPackingIds = new Set<string>();
  for (const ci of cloudPackingItems) {
    const existingId = localPackingByCloudId.get(ci.id);
    const itemData: Partial<PackingItem> = {
      cloudId: ci.id,
      name: ci.name,
      category: ci.category,
      packed: ci.packed,
      quantity: ci.quantity,
      suggested: ci.suggested,
      notes: ci.notes ?? undefined,
    };
    if (existingId) {
      store.updatePackingItem(existingId, itemData);
    } else {
      store.addPackingItem({
        tripId: localTripId,
        ...itemData,
      } as Omit<PackingItem, "id">);
    }
    cloudPackingIds.add(ci.id);
  }

  // 3. 清理阶段：删除本地有 cloudId 但云端已不存在的旧数据（无 cloudId 的本地新增保留）
  // 顺序：先删 expenses/notes/packing（引用方），再删 places（被引用方，
  // deletePlace 会级联删除指向它的 expenses/notes，这里先删子可避免意外级联）
  const latestExpenses = useTripStore.getState().expenses.filter((e) => e.tripId === localTripId);
  for (const le of latestExpenses) {
    if (le.cloudId && !cloudExpenseIds.has(le.cloudId)) {
      store.deleteExpense(le.id);
    }
  }
  const latestNotes = useTripStore.getState().notes.filter((n) => n.tripId === localTripId);
  for (const ln of latestNotes) {
    if (ln.cloudId && !cloudNoteIds.has(ln.cloudId)) {
      store.deleteNote(ln.id);
    }
  }
  const latestPacking = useTripStore.getState().packingItems.filter((i) => i.tripId === localTripId);
  for (const li of latestPacking) {
    if (li.cloudId && !cloudPackingIds.has(li.cloudId)) {
      store.deletePackingItem(li.id);
    }
  }
  const latestPlaces = useTripStore.getState().places.filter((p) => p.tripId === localTripId);
  for (const lp of latestPlaces) {
    if (lp.cloudId && !cloudPlaceIds.has(lp.cloudId)) {
      store.deletePlace(lp.id);
    }
  }
}

// ==================== 全量同步 ====================

/**
 * 全量同步：先推送所有本地行程，再拉取云端行程。
 * 单个行程推送失败不会中断整体流程，错误收集到 result.errors。
 *
 * 互斥锁：同一时间只允许一个 syncAll 执行，并发调用返回同一个 Promise。
 */
let syncLock: Promise<SyncResult> | null = null;

export async function syncAll(userId: string): Promise<SyncResult> {
  // 如果已有同步在进行中，返回同一个 Promise（互斥）
  if (syncLock) {
    return syncLock;
  }

  syncLock = (async () => {
    if (!supabase) throw new Error("Supabase 未配置");

    const store = useTripStore.getState();
    const errors: string[] = [];
    let pushed = 0;

    // 阶段 1：推送所有本地行程
    for (const trip of store.trips) {
      try {
        await pushTripToCloud(trip.id, userId);
        pushed++;
      } catch (err) {
        errors.push(
          `推送"${trip.title}"失败: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    // 阶段 2：拉取云端行程
    let pulled = 0;
    try {
      pulled = await pullCloudTrips(userId);
    } catch (err) {
      errors.push(
        `拉取云端数据失败: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    return { pushed, pulled, errors };
  })().finally(() => {
    syncLock = null;
  });

  return syncLock;
}

// ==================== 云端删除 ====================

/**
 * 从云端删除行程（子表通过 ON DELETE CASCADE 自动级联删除）。
 * 本地数据需由调用方单独删除。
 */
export async function deleteTripFromCloud(cloudId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("trips").delete().eq("id", cloudId);
  if (error) throw new Error(`云端删除失败: ${error.message}`);
}
