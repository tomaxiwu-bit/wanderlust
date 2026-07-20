"use client";

/**
 * 旅行足迹地图
 *
 * 灵感来源：AdventureLog 的 Travel Atlas
 * - 世界地图展示所有去过的地点
 * - 旅行统计数据（行程数、地点数、天数、目的地数）
 * - 按目的地分组的足迹列表
 */

import { useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useTripStore } from "@/stores/trip-store";
import { useHydrated } from "@/hooks/useHydrated";
import { daysBetween, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui";
import {
  Plane,
  MapPin,
  Calendar,
  Compass,
  Globe2,
  Footprints,
  Loader2,
  ArrowRight,
} from "lucide-react";
import type { Place } from "@/types";

// 动态导入地图组件，避免 SSR 问题
const AtlasMap = dynamic(() => import("@/components/map/AtlasMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

interface AtlasMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  tripId: string;
  tripTitle: string;
  destination: string;
  type: Place["type"];
}

export default function AtlasPage() {
  const { trips, places } = useTripStore();
  const hydrated = useHydrated();

  // 收集所有有坐标的地点作为地图标记
  const markers: AtlasMarker[] = useMemo(() => {
    return places
      .filter((p) => p.lat != null && p.lng != null)
      .map((p) => {
        const trip = trips.find((t) => t.id === p.tripId);
        return {
          id: p.id,
          name: p.name,
          lat: p.lat!,
          lng: p.lng!,
          tripId: p.tripId,
          tripTitle: trip?.title ?? "未知行程",
          destination: trip?.destination ?? "未知",
          type: p.type,
        };
      });
  }, [places, trips]);

  // 统计数据
  const stats = useMemo(() => {
    const totalTrips = trips.length;
    const totalPlaces = places.length;
    const totalDays = trips.reduce(
      (sum, t) => sum + daysBetween(t.startDate, t.endDate),
      0
    );
    const uniqueDestinations = new Set(
      trips.map((t) => t.destination)
    ).size;
    const completedTrips = trips.filter((t) => t.status === "completed").length;

    return {
      totalTrips,
      totalPlaces,
      totalDays,
      uniqueDestinations,
      completedTrips,
    };
  }, [trips, places]);

  // 按目的地分组
  const byDestination = useMemo(() => {
    const groups: Record<
      string,
      { tripId: string; tripTitle: string; places: number; days: number; startDate: string }[]
    > = {};

    for (const trip of trips) {
      const dest = trip.destination;
      if (!groups[dest]) groups[dest] = [];
      const tripPlaces = places.filter((p) => p.tripId === trip.id);
      groups[dest].push({
        tripId: trip.id,
        tripTitle: trip.title,
        places: tripPlaces.length,
        days: daysBetween(trip.startDate, trip.endDate),
        startDate: trip.startDate,
      });
    }

    // 按行程数排序
    return Object.entries(groups).sort(
      (a, b) => b[1].length - a[1].length
    );
  }, [trips, places]);

  if (!hydrated) {
    return (
      <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-20 sm:px-6 lg:px-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statCards = [
    {
      label: "行程总数",
      value: stats.totalTrips,
      icon: Plane,
      color: "#3b82f6",
    },
    {
      label: "到访地点",
      value: stats.totalPlaces,
      icon: MapPin,
      color: "#10b981",
    },
    {
      label: "旅行天数",
      value: stats.totalDays,
      icon: Calendar,
      color: "#f59e0b",
    },
    {
      label: "目的地数",
      value: stats.uniqueDestinations,
      icon: Compass,
      color: "#8b5cf6",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* 头部 */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5">
            <Footprints className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">旅行足迹</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              记录你去过的每一个地方，见证你的旅行轨迹
            </p>
          </div>
        </div>
      </div>

      {trips.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
          <Globe2 className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-medium">还没有旅行足迹</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            创建你的第一个行程，开始记录旅行足迹吧
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            去创建行程
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 统计卡片 */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${stat.color}20` }}
                    >
                      <Icon className="h-4 w-4" style={{ color: stat.color }} />
                    </div>
                  </div>
                  <p className="mt-2 text-2xl font-bold">{stat.value}</p>
                </div>
              );
            })}
          </div>

          {/* 世界地图 */}
          {markers.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="border-b border-border px-5 py-3">
                <h2 className="flex items-center gap-2 font-semibold">
                  <Globe2 className="h-5 w-5 text-primary" />
                  足迹地图
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  共 {markers.length} 个地点标记 · 横跨 {stats.uniqueDestinations} 个目的地
                </p>
              </div>
              <div className="h-[450px] w-full">
                <AtlasMap markers={markers} />
              </div>
            </div>
          )}

          {/* 按目的地分组的足迹列表 */}
          <div>
            <h2 className="mb-4 text-lg font-semibold">目的地足迹</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {byDestination.map(([destination, tripList]) => (
                <div
                  key={destination}
                  className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 font-medium">
                      <MapPin className="h-4 w-4 text-primary" />
                      {destination}
                    </h3>
                    <Badge variant="primary">{tripList.length} 次行程</Badge>
                  </div>
                  <div className="space-y-2">
                    {tripList
                      .sort((a, b) => a.startDate.localeCompare(b.startDate))
                      .map((trip) => (
                        <Link
                          key={trip.tripId}
                          href={`/trip/${trip.tripId}`}
                          className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-secondary"
                        >
                          <span className="truncate">{trip.tripTitle}</span>
                          <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                            {formatDate(trip.startDate, "short")} · {trip.places} 地点
                          </span>
                        </Link>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
