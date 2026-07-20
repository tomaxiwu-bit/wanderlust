"use client";

import { useState, useEffect } from "react";
import { getMultiStopRoute, type RouteInfo } from "@/lib/routing";
import type { Place } from "@/types";

/**
 * 获取一天内各地点之间的路线信息
 * 自动按 order 排序，筛选有坐标的地点，调用 OSRM 批量获取路线
 *
 * @param places 当天的所有地点（未排序）
 * @returns routes（各段路线）、loading、总距离/时长
 */
export function useDayRoutes(places: Place[]) {
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [loading, setLoading] = useState(false);

  // 按 order 排序，筛选有坐标的地点
  const sortedPlaces = [...places].sort((a, b) => a.order - b.order);
  const geoPlaces = sortedPlaces.filter(
    (p) => p.lat != null && p.lng != null
  );

  // 用 place ID 序列作为依赖 key，顺序变化时会重新获取
  const placesKey = geoPlaces.map((p) => p.id).join("|");

  useEffect(() => {
    if (geoPlaces.length < 2) {
      setRoutes([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const points = geoPlaces.map(
      (p) => [p.lat!, p.lng!] as [number, number]
    );

    getMultiStopRoute(points).then((results) => {
      if (!cancelled) {
        setRoutes(results);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placesKey]);

  const totalDistance = routes.reduce((sum, r) => sum + r.distance, 0);
  const totalDuration = routes.reduce((sum, r) => sum + r.duration, 0);

  return { routes, loading, totalDistance, totalDuration, geoPlaces };
}

/**
 * 将路线信息映射到显示间隔中
 * 遍历所有相邻地点对，若两者都有坐标则分配对应的路线段，否则为 null
 *
 * @param sortedPlaces 已按 order 排序的地点列表
 * @param routes OSRM 返回的路线段数组（仅含有坐标的地点之间的路线）
 * @returns 与地点间隔一一对应的数组，元素为 RouteInfo | null
 */
export function mapRoutesToSegments(
  sortedPlaces: Place[],
  routes: RouteInfo[]
): (RouteInfo | null)[] {
  const segments: (RouteInfo | null)[] = [];
  let routeIdx = 0;

  for (let i = 0; i < sortedPlaces.length - 1; i++) {
    const curr = sortedPlaces[i];
    const next = sortedPlaces[i + 1];
    if (
      curr.lat != null &&
      curr.lng != null &&
      next.lat != null &&
      next.lng != null &&
      routeIdx < routes.length
    ) {
      segments.push(routes[routeIdx]);
      routeIdx++;
    } else {
      segments.push(null);
    }
  }

  return segments;
}
