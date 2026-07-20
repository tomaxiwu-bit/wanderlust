import type { PlaceType } from "@/types";
import { haversine, estimateCommute as estimateCommuteRaw } from "@/lib/haversine";

/** 智能规划使用的地点数据结构（与 Place 解耦，便于在 UI 层暂存心愿单） */
export interface PlannerPlace {
  name: string;
  type: PlaceType;
  address?: string;
  lat?: number;
  lng?: number;
  stayMinutes?: number;
}

/** 通勤信息（两地点之间） */
export interface CommuteInfo {
  distance: number; // 米
  duration: number; // 秒
}

/** 规划后的单日行程（含通勤信息） */
export interface PlannedDay {
  places: PlannerPlace[];
  /** 每段通勤信息，长度 = places.length - 1 */
  commutes: CommuteInfo[];
  /** 当日总通勤距离（米） */
  totalDistance: number;
  /** 当日总通勤时长（秒） */
  totalDuration: number;
  /** 当日总停留时长（分钟） */
  totalStay: number;
}

/**
 * 估算两地点之间的通勤距离和时长
 * 转发给公共模块 lib/haversine.ts，保持 PlannerPlace 接口
 */
export function estimateCommute(
  from: PlannerPlace,
  to: PlannerPlace
): CommuteInfo {
  if (
    from.lat == null ||
    from.lng == null ||
    to.lat == null ||
    to.lng == null
  ) {
    return { distance: 0, duration: 0 };
  }

  const { distance, duration } = estimateCommuteRaw(
    from.lat,
    from.lng,
    to.lat,
    to.lng
  );
  return { distance, duration };
}

/**
 * 按地理位置邻近度排序地点（最近邻算法）
 * 给定一组带坐标的地点，返回按路径优化的顺序：
 * 从第一个有坐标的地点出发，每一步选择距离当前点最近的未访问地点，
 * 直到所有有坐标的地点都被访问；无坐标的地点追加到末尾。
 */
export function optimizeOrder(places: PlannerPlace[]): PlannerPlace[] {
  if (places.length <= 1) return [...places];

  // 分离有坐标和无坐标的地点
  const withCoords = places.filter(
    (p) =>
      p.lat != null &&
      p.lng != null &&
      Number.isFinite(p.lat) &&
      Number.isFinite(p.lng)
  );
  const withoutCoords = places.filter(
    (p) => p.lat == null || p.lng == null
  );

  if (withCoords.length <= 1) return [...withCoords, ...withoutCoords];

  const visited = new Set<number>();
  const result: PlannerPlace[] = [];

  // 从第一个地点开始
  let currentIdx = 0;
  result.push(withCoords[0]);
  visited.add(0);

  while (result.length < withCoords.length) {
    let nearestIdx = -1;
    let nearestDist = Infinity;
    const current = withCoords[currentIdx];

    for (let i = 0; i < withCoords.length; i++) {
      if (visited.has(i)) continue;
      const dist = haversine(
        current.lat!,
        current.lng!,
        withCoords[i].lat!,
        withCoords[i].lng!
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    if (nearestIdx === -1) break;
    visited.add(nearestIdx);
    result.push(withCoords[nearestIdx]);
    currentIdx = nearestIdx;
  }

  // 无坐标的地点追加到最后
  return [...result, ...withoutCoords];
}

/**
 * 将地点列表按天分组并优化每日路线
 * @param places 待分配的地点列表
 * @param placesPerDay 每天游览的地点数
 * @returns 按天分组的地点列表（已优化顺序）
 */
export function planItinerary(
  places: PlannerPlace[],
  placesPerDay: number = 4
): PlannerPlace[][] {
  if (places.length === 0) return [];
  const perDay = Math.max(1, Math.min(placesPerDay, 10));

  // 先对所有地点做全局优化（按邻近度排序）
  const optimized = optimizeOrder(places);

  // 然后按每天 placesPerDay 个分组
  const days: PlannerPlace[][] = [];
  for (let i = 0; i < optimized.length; i += perDay) {
    days.push(optimized.slice(i, i + perDay));
  }

  return days;
}

/**
 * 将地点列表按天分组，并计算每段通勤信息
 * @param places 待分配的地点列表
 * @param placesPerDay 每天游览的地点数
 * @returns 按天分组的规划结果（含通勤信息）
 */
export function planItineraryWithCommute(
  places: PlannerPlace[],
  placesPerDay: number = 4
): PlannedDay[] {
  const dayGroups = planItinerary(places, placesPerDay);

  return dayGroups.map((dayPlaces) => {
    const commutes: CommuteInfo[] = [];
    let totalDistance = 0;
    let totalDuration = 0;
    let totalStay = 0;

    for (let i = 0; i < dayPlaces.length - 1; i++) {
      const commute = estimateCommute(dayPlaces[i], dayPlaces[i + 1]);
      commutes.push(commute);
      totalDistance += commute.distance;
      totalDuration += commute.duration;
    }

    for (const p of dayPlaces) {
      totalStay += p.stayMinutes ?? 0;
    }

    return {
      places: dayPlaces,
      commutes,
      totalDistance,
      totalDuration,
      totalStay,
    };
  });
}
