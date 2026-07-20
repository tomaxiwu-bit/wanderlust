"use client";

import { useState, useEffect, useMemo } from "react";
import { getMultiStopRoute, type RouteInfo } from "@/lib/routing";
import type { Place } from "@/types";

/**
 * 获取所有天数的路线信息（地图页使用）
 * 按天分组地点，为每天获取 OSRM 路线
 *
 * @param places 所有地点（跨天）
 * @returns routesByDay（dayIndex → RouteInfo[]）、loading
 */
export function useAllDayRoutes(places: Place[]) {
  const [routesByDay, setRoutesByDay] = useState<Record<number, RouteInfo[]>>({});
  const [loading, setLoading] = useState(false);

  // 按天分组并排序，筛选有坐标的地点
  const dayGroups = useMemo(() => {
    const groups: Record<number, Place[]> = {};
    for (const place of places) {
      if (place.lat == null || place.lng == null) continue;
      if (!groups[place.dayIndex]) groups[place.dayIndex] = [];
      groups[place.dayIndex].push(place);
    }
    // 每天按 order 排序
    for (const day of Object.keys(groups)) {
      groups[Number(day)].sort((a, b) => a.order - b.order);
    }
    return groups;
  }, [places]);

  // 生成依赖 key：每天的地点 ID 序列
  const depKey = useMemo(
    () =>
      Object.entries(dayGroups)
        .map(([day, dayPlaces]) => `${day}:${dayPlaces.map((p) => p.id).join(",")}`)
        .join("|"),
    [dayGroups]
  );

  useEffect(() => {
    const days = Object.keys(dayGroups);
    if (days.length === 0) {
      setRoutesByDay({});
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);

    // 逐天获取路线（OSRM 限频，串行请求）
    const fetchAll = async () => {
      const result: Record<number, RouteInfo[]> = {};
      for (const day of days) {
        const dayPlaces = dayGroups[Number(day)];
        if (dayPlaces.length < 2) continue;
        const points = dayPlaces.map(
          (p) => [p.lat!, p.lng!] as [number, number]
        );
        const routes = await getMultiStopRoute(points, controller.signal);
        if (cancelled || controller.signal.aborted) return;
        result[Number(day)] = routes;
      }
      if (!cancelled) {
        setRoutesByDay(result);
        setLoading(false);
      }
    };

    fetchAll();

    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey]);

  return { routesByDay, loading };
}
