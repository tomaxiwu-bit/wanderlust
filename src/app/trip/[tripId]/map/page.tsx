"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useTripStore } from "@/stores/trip-store";
import { useAllDayRoutes } from "@/hooks/useAllDayRoutes";
import { getPlaceTypeConfig } from "@/lib/constants";
import { EmptyState } from "@/components/ui";
import { MapPin, Plus } from "lucide-react";
import Link from "next/link";

// 动态加载地图组件（Leaflet 需要 window 对象）
const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] animate-pulse rounded-xl border border-border bg-secondary/30 sm:h-[500px] lg:h-[600px]" />
  ),
});

export default function MapPage() {
  const params = useParams<{ tripId: string }>();
  const trip = useTripStore((s) => s.trips.find((t) => t.id === params.tripId));
  const allPlaces = useTripStore((s) => s.places);
  const places = useMemo(
    () =>
      allPlaces
        .filter((p) => p.tripId === params.tripId)
        .sort((a, b) => a.dayIndex - b.dayIndex || a.order - b.order),
    [allPlaces, params.tripId]
  );

  // 获取每天的 OSRM 路线（用于地图绘制真实道路）
  const { routesByDay } = useAllDayRoutes(places);

  if (!trip) return null;

  // 按天分组
  const placesByDay = places.reduce((acc, place) => {
    if (!acc[place.dayIndex]) acc[place.dayIndex] = [];
    acc[place.dayIndex].push(place);
    return acc;
  }, {} as Record<number, typeof places>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">地图视图</h2>
        <span className="text-sm text-muted-foreground">
          {places.length} 个地点
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 地图 */}
        <div className="lg:col-span-2">
          <div className="h-[400px] overflow-hidden rounded-xl border border-border sm:h-[500px] lg:h-[600px]">
            <MapView places={places} routesByDay={routesByDay} />
          </div>
        </div>

        {/* 地点列表 */}
        <div className="space-y-4">
          {Object.entries(placesByDay).map(([day, dayPlaces]) => (
            <div
              key={day}
              className="rounded-xl border border-border bg-card p-4"
            >
              <h3 className="mb-3 font-medium">第 {Number(day) + 1} 天</h3>
              <div className="space-y-2">
                {dayPlaces.map((place) => {
                  const config = getPlaceTypeConfig(place.type);
                  return (
                    <div
                      key={place.id}
                      className="flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-secondary/50"
                    >
                      <MapPin
                        className="h-4 w-4"
                        style={{ color: config.color }}
                      />
                      <span>{place.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {places.length === 0 && (
            <EmptyState
              icon={<MapPin className="h-12 w-12" />}
              title="还没有地点"
              description="请先在「日程编排」中添加地点"
              action={
                <Link
                  href={`/trip/${trip.id}/itinerary`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <Plus className="h-4 w-4" />
                  去添加
                </Link>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
