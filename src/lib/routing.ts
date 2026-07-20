/**
 * 路线规划服务
 * 通过本地 API 代理（/api/route）调用 OSRM 或使用估算兜底
 *
 * 代理内部策略：
 * - 首次尝试 OSRM 公共 API（5s 超时）
 * - OSRM 不可达时自动切换 Haversine + 分段速度估算
 * - 缓存 OSRM 可用性，避免重复超时等待
 */

import { estimateCommute } from "@/lib/haversine";

const ROUTE_PROXY = "/api/route";

/** 出行方式（目前仅 driving，OSRM 公共服务限制） */
export type TravelMode = "driving";

/** 路线信息 */
export interface RouteInfo {
  distance: number; // 距离（米）
  duration: number; // 时长（秒）
  geometry: [number, number][]; // 路线坐标点 [lat, lng]
}

/**
 * 获取两点之间的路线（通过本地代理）
 * @param from 起点坐标 [lat, lng]
 * @param to 终点坐标 [lat, lng]
 * @param signal 可选的 AbortSignal，用于取消请求
 * @returns 路线信息，失败返回 null
 */
export async function getRoute(
  from: [number, number],
  to: [number, number],
  signal?: AbortSignal
): Promise<RouteInfo | null> {
  const coordsStr = `${from[0]},${from[1]};${to[0]},${to[1]}`;
  const url = `${ROUTE_PROXY}?coords=${encodeURIComponent(coordsStr)}`;

  try {
    const fetchSignal = signal
      ? AbortSignal.any([signal, AbortSignal.timeout(12000)])
      : AbortSignal.timeout(12000);
    const res = await fetch(url, { signal: fetchSignal });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.routes?.length) return null;

    const route = data.routes[0];
    return {
      distance: route.distance,
      duration: route.duration,
      geometry: route.geometry || [],
    };
  } catch (err) {
    // AbortError 是组件卸载时的正常取消，不需要警告
    if (!(err instanceof DOMException && err.name === "AbortError")) {
      console.warn("[Routing] 路线规划失败，使用估算兜底:", err);
    }
    return null;
  }
}

/**
 * 获取多点连线的路线（途经多个航点）
 * 单次请求发送所有坐标到代理，由代理统一处理 OSRM/估算
 * @param points 坐标点列表 [lat, lng][]
 * @param signal 可选的 AbortSignal，用于取消请求
 * @returns 各段路线信息
 */
export async function getMultiStopRoute(
  points: [number, number][],
  signal?: AbortSignal
): Promise<RouteInfo[]> {
  if (points.length < 2) return [];

  const coordsStr = points.map(([lat, lng]) => `${lat},${lng}`).join(";");
  const url = `${ROUTE_PROXY}?coords=${encodeURIComponent(coordsStr)}`;

  try {
    const fetchSignal = signal
      ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
      : AbortSignal.timeout(15000);
    const res = await fetch(url, { signal: fetchSignal });
    if (!res.ok) throw new Error(`Route proxy error: ${res.status}`);

    const data = await res.json();
    if (!data.routes?.length) return [];

    return data.routes.map(
      (route: { distance: number; duration: number; geometry?: number[][] }) => ({
        distance: route.distance,
        duration: route.duration,
        geometry: (route.geometry || []) as [number, number][],
      })
    );
  } catch (err) {
    // AbortError 是组件卸载时的正常取消，不需要警告
    if (!(err instanceof DOMException && err.name === "AbortError")) {
      console.warn("[Routing] 多点路线规划失败，使用本地估算兜底:", err);
    }
    // 最终兜底：使用统一的 haversine + 分段速度估算
    return points.slice(0, -1).map((_, i) => {
      const { distance, duration } = estimateCommute(
        points[i][0],
        points[i][1],
        points[i + 1][0],
        points[i + 1][1]
      );
      return {
        distance,
        duration,
        geometry: [points[i], points[i + 1]],
      };
    });
  }
}

/**
 * 格式化距离
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} 米`;
  return `${(meters / 1000).toFixed(1)} 公里`;
}

/**
 * 格式化旅行时长（秒 → 可读）
 * 与 utils.ts 的 formatDuration(分钟) 区分，此函数接受秒数
 */
export function formatTravelTime(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours} 小时 ${mins} 分钟` : `${hours} 小时`;
}
