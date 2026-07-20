"use client";

/**
 * 分享行程只读页面
 *
 * 灵感来源：Visited / Wanderlog 的行程分享
 * 通过 URL 中的 base64 编码数据展示行程
 * 无需登录，纯只读浏览
 */

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { decodeTripFromShare } from "@/lib/share";
import type { ShareableTrip } from "@/lib/share";
import { daysBetween, formatDate, formatCurrency } from "@/lib/utils";
import { getPlaceTypeConfig, getExpenseCategoryConfig } from "@/lib/constants";
import { Badge } from "@/components/ui";
import { parseISO, addDays, format } from "date-fns";
import {
  MapPin,
  Calendar,
  Wallet,
  Plane,
  Loader2,
  AlertCircle,
  Clock,
} from "lucide-react";

// 动态导入地图
const SharedMap = dynamic(() => import("@/components/map/AtlasMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[300px] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

export default function SharedTripPage() {
  const params = useParams<{ data: string }>();
  const [activeTab, setActiveTab] = useState<"itinerary" | "map" | "budget">("itinerary");

  const tripData: ShareableTrip | null = useMemo(() => {
    if (!params.data) return null;
    return decodeTripFromShare(params.data);
  }, [params.data]);

  const places = tripData?.places;
  const expenses = tripData?.expenses;
  const notes = tripData?.notes;

  // Hooks must always run in the same order, including for an invalid share URL.
  const placesByDay = useMemo(() => {
    const groups: Record<number, ShareableTrip["places"]> = {};
    for (const p of places ?? []) {
      if (!groups[p.dayIndex]) groups[p.dayIndex] = [];
      groups[p.dayIndex].push(p);
    }
    for (const day of Object.keys(groups)) {
      groups[Number(day)].sort((a, b) => a.order - b.order);
    }
    return groups;
  }, [places]);

  const expensesByCategory = useMemo(() => {
    const groups: Record<string, number> = {};
    for (const e of expenses ?? []) {
      groups[e.category] = (groups[e.category] ?? 0) + e.amount;
    }
    return groups;
  }, [expenses]);

  if (!tripData) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center px-4 py-20 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
        <h1 className="text-xl font-bold">无法加载行程</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          分享链接可能已损坏或过期
        </p>
      </div>
    );
  }

  const { trip } = tripData;
  const totalDays = daysBetween(trip.startDate, trip.endDate);
  const totalSpent = (expenses ?? []).reduce((sum, e) => sum + e.amount, 0);

  // 地图标记
  const markers = (places ?? [])
    .filter((p) => p.lat != null && p.lng != null)
    .map((p) => ({
      id: p.id,
      name: p.name,
      lat: p.lat!,
      lng: p.lng!,
      tripId: "shared",
      tripTitle: trip.title,
      destination: trip.destination,
      type: p.type,
    }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      {/* 头部 */}
      <div className="mb-6 rounded-xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5">
            <Plane className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{trip.title}</h1>
              <Badge variant="info">分享行程</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              <MapPin className="mr-1 inline h-3.5 w-3.5" />
              {trip.destination}
              <Calendar className="ml-3 mr-1 inline h-3.5 w-3.5" />
              {formatDate(trip.startDate, "short")} ~ {formatDate(trip.endDate, "short")}
              <span className="ml-2">· {totalDays} 天</span>
            </p>
            {trip.description && (
              <p className="mt-2 text-sm">{trip.description}</p>
            )}
          </div>
        </div>

        {/* 统计 */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-secondary/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">地点</p>
            <p className="mt-1 text-lg font-bold">{places?.length ?? 0}</p>
          </div>
          <div className="rounded-lg bg-secondary/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">花费</p>
            <p className="mt-1 text-lg font-bold">
              {formatCurrency(totalSpent, trip.baseCurrency)}
            </p>
          </div>
          <div className="rounded-lg bg-secondary/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">笔记</p>
            <p className="mt-1 text-lg font-bold">{notes?.length ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="mb-4 flex gap-1 rounded-lg bg-secondary/50 p-1">
        {[
          { key: "itinerary" as const, label: "行程", icon: Calendar },
          { key: "map" as const, label: "地图", icon: MapPin },
          { key: "budget" as const, label: "花费", icon: Wallet },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 内容 */}
      {activeTab === "itinerary" && (
        <div className="space-y-4">
          {Array.from({ length: totalDays }).map((_, dayIdx) => {
            const dayPlaces = placesByDay[dayIdx] ?? [];
            const dayDate = format(addDays(parseISO(trip.startDate), dayIdx), "yyyy-MM-dd");
            return (
              <div key={dayIdx} className="rounded-xl border border-border bg-card p-4">
                <h3 className="mb-3 flex items-center gap-2 font-semibold">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-sm text-primary">
                    {dayIdx + 1}
                  </span>
                  第 {dayIdx + 1} 天
                  <span className="text-xs font-normal text-muted-foreground">
                    {formatDate(dayDate, "short")}
                  </span>
                </h3>
                {dayPlaces.length === 0 ? (
                  <p className="py-2 text-sm text-muted-foreground">暂无安排</p>
                ) : (
                  <div className="space-y-2">
                    {dayPlaces.map((place) => {
                      const config = getPlaceTypeConfig(place.type);
                      return (
                        <div
                          key={place.id}
                          className="flex items-center gap-3 rounded-lg border border-border p-3"
                        >
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-lg"
                            style={{ backgroundColor: `${config.color}20` }}
                          >
                            <MapPin className="h-4 w-4" style={{ color: config.color }} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{place.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span style={{ color: config.color }}>{config.label}</span>
                              {place.stayMinutes && (
                                <span className="flex items-center gap-0.5">
                                  <Clock className="h-3 w-3" />
                                  {place.stayMinutes} 分钟
                                </span>
                              )}
                              {place.address && <span>· {place.address}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "map" && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {markers.length > 0 ? (
            <div className="h-[400px]">
              <SharedMap markers={markers} />
            </div>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
              <MapPin className="mr-2 h-5 w-5" />
              无坐标数据
            </div>
          )}
        </div>
      )}

      {activeTab === "budget" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 font-semibold">支出总览</h3>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(totalSpent, trip.baseCurrency)}
            </p>
          </div>
          {Object.entries(expensesByCategory).length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 font-semibold">分类统计</h3>
              <div className="space-y-2">
                {Object.entries(expensesByCategory).map(([cat, amount]) => {
                  const config = getExpenseCategoryConfig(cat);
                  return (
                    <div key={cat} className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: config.color }}>
                        {config.label}
                      </span>
                      <span className="text-sm font-medium">
                        {formatCurrency(amount, trip.baseCurrency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 底部 */}
      <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Plane className="h-3.5 w-3.5" />
        由 Wanderlust 漫游规划器 生成
      </div>
    </div>
  );
}
