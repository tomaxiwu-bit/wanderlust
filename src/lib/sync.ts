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
  const tripRow = {
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
    const placeRow = {
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
    const expenseRow = {
      ...(expense.cloudId ? { id: expense.cloudId } : {}),
      trip_id: cloudTripId,
      place_id: expense.placeId
        ? placeIdMap.get(expense.placeId) ?? null
        : null,
      category: expense.category,
      amount: expense.amount,
      currency: expense.currency,
      converted_amount: expense.convertedAmount ?? null,
      date: expense.date,
      description: expense.description ?? null,
      paid_by: expense.paidBy ?? null,
      split_among: expense.splitAmong ?? [],
    };
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
    const noteRow = {
      ...(note.cloudId ? { id: note.cloudId } : {}),
      trip_id: cloudTripId,
      place_id: note.placeId
        ? placeIdMap.get(note.placeId) ?? null
        : null,
      title: note.title,
      content: note.content,
    };
    const { data, error } = await supabase
      .from("notes")
      .upsert(noteRow)
      .select("id")
      .single();
    if (error) throw new Error(`同步笔记"${note.title}"失败: ${error.message}`);
    store.updateNote(note.id, { cloudId: data.id });
  }

  // 5. Upsert 打包清单
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
        store.updateTrip(existing.id, {
          title: ct.title,
          description: ct.description ?? undefined,
          destination: ct.destination,
          startDate: ct.start_date,
          endDate: ct.end_date,
          coverImage: ct.cover_image ?? undefined,
          status: ct.status,
          visibility: ct.visibility,
          baseCurrency: ct.base_currency,
          budgetLimit: ct.budget_limit ?? undefined,
          participants: Array.isArray(ct.participants) ? ct.participants : undefined,
          updatedAt: ct.updated_at,
        });
        await replaceLocalChildren(existing.id, ct.id);
        pulled++;
      }
    } else {
      // 新的云端行程：创建本地副本
      const newTrip = store.addTrip({
        userId,
        cloudId: ct.id,
        title: ct.title,
        description: ct.description ?? undefined,
        destination: ct.destination,
        startDate: ct.start_date,
        endDate: ct.end_date,
        coverImage: ct.cover_image ?? undefined,
        status: ct.status,
        visibility: ct.visibility,
        baseCurrency: ct.base_currency,
        budgetLimit: ct.budget_limit ?? undefined,
        participants: Array.isArray(ct.participants) ? ct.participants : undefined,
      });
      await replaceLocalChildren(newTrip.id, ct.id);
      pulled++;
    }
  }
  return pulled;
}

/**
 * 用云端子数据完全替换某个本地行程的子数据（places/expenses/notes/packingItems）。
 *
 * 安全策略（先拉后清）：
 * - 先并行拉取云端 places/expenses/notes/packingItems
 * - 全部成功后才清除本地子数据并写入云端数据
 * - 任一拉取失败则保留本地数据不变，避免数据丢失
 */
async function replaceLocalChildren(
  localTripId: string,
  cloudTripId: string
): Promise<void> {
  if (!supabase) return;
  const store = useTripStore.getState();

  // 先并行拉取云端子数据（不修改本地状态）
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

  // 拉取全部成功，用云端数据替换本地
  store.clearTripChildren(localTripId);

  const placeCloudToLocal = new Map<string, string>(); // cloudId → localId
  for (const cp of cloudPlaces) {
    const newPlace = store.addPlace({
      tripId: localTripId,
      cloudId: cp.id,
      dayIndex: cp.day_index,
      name: cp.name,
      address: cp.address ?? undefined,
      lat: cp.lat ?? undefined,
      lng: cp.lng ?? undefined,
      type: cp.type,
      stayMinutes: cp.stay_minutes ?? undefined,
      order: cp.order,
      notes: cp.notes ?? undefined,
      rating: cp.rating ?? undefined,
      imageUrl: cp.image_url ?? undefined,
      websiteUrl: cp.website_url ?? undefined,
    });
    placeCloudToLocal.set(cp.id, newPlace.id);
  }

  for (const ce of cloudExpenses) {
    store.addExpense({
      tripId: localTripId,
      cloudId: ce.id,
      placeId: ce.place_id
        ? placeCloudToLocal.get(ce.place_id) ?? undefined
        : undefined,
      category: ce.category,
      amount: Number(ce.amount),
      currency: ce.currency,
      convertedAmount: ce.converted_amount
        ? Number(ce.converted_amount)
        : undefined,
      date: ce.date,
      description: ce.description ?? undefined,
      paidBy: ce.paid_by ?? undefined,
      splitAmong: Array.isArray(ce.split_among) ? ce.split_among : undefined,
    });
  }

  for (const cn of cloudNotes) {
    store.addNote({
      tripId: localTripId,
      cloudId: cn.id,
      placeId: cn.place_id
        ? placeCloudToLocal.get(cn.place_id) ?? undefined
        : undefined,
      title: cn.title,
      content: cn.content,
    });
  }

  for (const ci of cloudPackingItems) {
    store.addPackingItem({
      tripId: localTripId,
      cloudId: ci.id,
      name: ci.name,
      category: ci.category,
      packed: ci.packed,
      quantity: ci.quantity,
      suggested: ci.suggested,
      notes: ci.notes ?? undefined,
    });
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
