"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useTripStore } from "@/stores/trip-store";
import { daysBetween, formatDate, formatDuration } from "@/lib/utils";
import {
  formatDistance,
  formatTravelTime,
  type RouteInfo,
} from "@/lib/routing";
import { addDays, parseISO } from "date-fns";
import {
  Plus,
  Clock,
  MapPin,
  Route as RouteIcon,
  Loader2,
  ArrowDown,
  Sparkles,
  Navigation,
} from "lucide-react";
import { SortablePlaceItem } from "@/components/itinerary/SortablePlaceItem";
import { PlaceFormModal } from "@/components/itinerary/PlaceFormModal";
import { SmartPlannerModal } from "@/components/itinerary/SmartPlannerModal";
import { TransitGuideModal } from "@/components/itinerary/TransitGuideModal";
import { useDayRoutes, mapRoutesToSegments } from "@/hooks/useDayRoutes";
import { useTripWeather } from "@/hooks/useTripWeather";
import { Button, confirm } from "@/components/ui";
import { WeatherBadge } from "@/components/trip/WeatherBadge";
import type { Place, PlaceType } from "@/types";
import type { PlannerPlace } from "@/lib/planner";
import { format } from "date-fns";

export default function ItineraryPage() {
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
  const addPlace = useTripStore((s) => s.addPlace);
  const updatePlace = useTripStore((s) => s.updatePlace);
  const deletePlace = useTripStore((s) => s.deletePlace);
  const reorderPlaces = useTripStore((s) => s.reorderPlaces);

  // 弹窗状态
  const [modalState, setModalState] = useState<{
    open: boolean;
    place: Place | null; // null = 新建模式
    dayIndex: number;
  }>({ open: false, place: null, dayIndex: 0 });

  // 智能规划弹窗状态
  const [showSmartPlanner, setShowSmartPlanner] = useState(false);

  // 乘车方案弹窗状态
  const [transitGuide, setTransitGuide] = useState<{
    open: boolean;
    origin: { name: string; lat: number; lng: number } | null;
    destination: { name: string; lat: number; lng: number } | null;
    estimate?: { distance: number; duration: number };
  }>({ open: false, origin: null, destination: null });

  // 天气数据：用第一个有坐标的地点作为天气查询点
  const weatherCoord = useMemo(() => {
    const firstWithCoord = places.find((p) => p.lat != null && p.lng != null);
    return firstWithCoord
      ? { lat: firstWithCoord.lat!, lng: firstWithCoord.lng! }
      : undefined;
  }, [places]);
  const { weather: weatherMap, loading: weatherLoading } = useTripWeather(
    trip,
    weatherCoord?.lat,
    weatherCoord?.lng
  );

  if (!trip) return null;

  const totalDays = daysBetween(trip.startDate, trip.endDate);
  const days = Array.from({ length: totalDays }, (_, i) => i);

  const handleDragEnd = (dayIndex: number, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // 按 order 排序后再查找索引，确保拖拽位置正确
    const dayPlaces = places
      .filter((p) => p.dayIndex === dayIndex)
      .sort((a, b) => a.order - b.order);
    const oldIndex = dayPlaces.findIndex((p) => p.id === active.id);
    const newIndex = dayPlaces.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(dayPlaces, oldIndex, newIndex);
    reorderPlaces(
      newOrder.map((p) => p.id),
      dayIndex
    );
  };

  const handleSubmit = (data: {
    name: string;
    type: PlaceType;
    address?: string;
    stayMinutes?: number;
    lat?: number;
    lng?: number;
  }) => {
    if (modalState.place) {
      updatePlace(modalState.place.id, data);
    } else {
      const dayPlaces = places.filter(
        (p) => p.dayIndex === modalState.dayIndex
      );
      addPlace({
        tripId: trip.id,
        dayIndex: modalState.dayIndex,
        order: dayPlaces.length,
        ...data,
      });
    }
    setModalState({ open: false, place: null, dayIndex: 0 });
  };

  // 智能规划：清空现有地点后按天写入新地点
  // （覆盖确认已在 SmartPlannerModal 内部通过 confirm 处理）
  const handleSmartPlan = (days: PlannerPlace[][]) => {
    // 先删除当前行程的所有地点
    places.forEach((p) => deletePlace(p.id));
    // 再按天写入新地点
    days.forEach((dayPlaces, dayIndex) => {
      dayPlaces.forEach((place, order) => {
        addPlace({
          tripId: trip.id,
          dayIndex,
          order,
          name: place.name,
          type: place.type,
          address: place.address,
          lat: place.lat,
          lng: place.lng,
          stayMinutes: place.stayMinutes,
        });
      });
    });
    setShowSmartPlanner(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">日程编排</h2>
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Sparkles className="h-4 w-4" />}
            onClick={() => setShowSmartPlanner(true)}
          >
            智能规划
          </Button>
          <span className="text-sm text-muted-foreground">
            共 {totalDays} 天 · {places.length} 个地点
          </span>
        </div>
      </div>

      {days.map((dayIndex) => (
        <DaySection
          key={dayIndex}
          dayIndex={dayIndex}
          dayDate={addDays(parseISO(trip.startDate), dayIndex)}
          dayPlaces={places.filter((p) => p.dayIndex === dayIndex)}
          weather={weatherMap.get(format(addDays(parseISO(trip.startDate), dayIndex), "yyyy-MM-dd")) ?? null}
          weatherLoading={weatherLoading}
          onDragEnd={(e) => handleDragEnd(dayIndex, e)}
          onAddPlace={() =>
            setModalState({ open: true, place: null, dayIndex })
          }
          onEditPlace={(p) =>
            setModalState({ open: true, place: p, dayIndex })
          }
          onDeletePlace={async (id) => {
            const ok = await confirm({
              title: "删除此地点？",
              description: "该地点关联的支出和笔记也将被永久删除，此操作不可撤销。",
              confirmText: "删除",
              variant: "danger",
            });
            if (ok) deletePlace(id);
          }}
          onShowTransitGuide={(origin, destination, estimate) =>
            setTransitGuide({ open: true, origin, destination, estimate })
          }
        />
      ))}

      {/* 地点编辑/新建弹窗 */}
      {modalState.open && (
        <PlaceFormModal
          place={modalState.place}
          onClose={() =>
            setModalState({ open: false, place: null, dayIndex: 0 })
          }
          onSubmit={handleSubmit}
        />
      )}

      {/* 智能规划弹窗 */}
      <SmartPlannerModal
        open={showSmartPlanner}
        onClose={() => setShowSmartPlanner(false)}
        onPlan={handleSmartPlan}
        existingPlaceCount={places.length}
      />

      {/* 乘车方案弹窗 */}
      {transitGuide.open &&
        transitGuide.origin &&
        transitGuide.destination && (
          <TransitGuideModal
            open={transitGuide.open}
            onClose={() =>
              setTransitGuide({ ...transitGuide, open: false })
            }
            origin={transitGuide.origin}
            destination={transitGuide.destination}
            estimate={transitGuide.estimate}
          />
        )}
    </div>
  );
}

// ==================== 单日行程组件 ====================

function DaySection({
  dayIndex,
  dayDate,
  dayPlaces,
  weather,
  weatherLoading,
  onDragEnd,
  onAddPlace,
  onEditPlace,
  onDeletePlace,
  onShowTransitGuide,
}: {
  dayIndex: number;
  dayDate: Date;
  dayPlaces: Place[];
  weather: import("@/lib/weather").WeatherData | null;
  weatherLoading: boolean;
  onDragEnd: (event: DragEndEvent) => void;
  onAddPlace: () => void;
  onEditPlace: (place: Place) => void;
  onDeletePlace: (id: string) => void;
  onShowTransitGuide: (
    origin: { name: string; lat: number; lng: number },
    destination: { name: string; lat: number; lng: number },
    estimate: { distance: number; duration: number }
  ) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 获取当天路线信息
  const { routes, loading, totalDistance, totalDuration } =
    useDayRoutes(dayPlaces);

  // 按 order 排序
  const sortedPlaces = [...dayPlaces].sort((a, b) => a.order - b.order);
  const segments = mapRoutesToSegments(sortedPlaces, routes);
  const totalMinutes = dayPlaces.reduce(
    (sum, p) => sum + (p.stayMinutes ?? 0),
    0
  );

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      {/* 日期头 */}
      <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
        <div>
          <h3 className="font-semibold">第 {dayIndex + 1} 天</h3>
          <div className="mt-0.5 flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {formatDate(dayDate, "full")}
            </p>
            <WeatherBadge weather={weather} loading={weatherLoading} />
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {totalMinutes > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDuration(totalMinutes)}
            </span>
          )}
          {totalDistance > 0 && (
            <span className="flex items-center gap-1">
              <RouteIcon className="h-3.5 w-3.5" />
              {formatDistance(totalDistance)} ·{" "}
              {formatTravelTime(totalDuration)}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={onAddPlace}
          >
            添加地点
          </Button>
        </div>
      </div>

      {/* 地点列表（可拖拽 + 路线信息） */}
      {dayPlaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
          <MapPin className="mb-2 h-8 w-8" />
          <p className="text-sm">还没有添加地点</p>
          <p className="mt-1 text-xs">点击上方&ldquo;添加地点&rdquo;开始规划</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={sortedPlaces.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {sortedPlaces.flatMap((place, idx) => {
                const items: React.ReactNode[] = [
                  <SortablePlaceItem
                    key={place.id}
                    place={place}
                    index={idx}
                    onDelete={onDeletePlace}
                    onEdit={onEditPlace}
                  />,
                ];
                // 在地点之间插入路线信息
                if (idx < sortedPlaces.length - 1) {
                  const nextPlace = sortedPlaces[idx + 1];
                  const hasCoords =
                    place.lat != null &&
                    place.lng != null &&
                    nextPlace.lat != null &&
                    nextPlace.lng != null;
                  items.push(
                    <RouteBadge
                      key={`route-${place.id}`}
                      route={segments[idx]}
                      loading={loading}
                      hasCoords={hasCoords}
                      origin={{
                        name: place.name,
                        lat: place.lat!,
                        lng: place.lng!,
                      }}
                      destination={{
                        name: nextPlace.name,
                        lat: nextPlace.lat!,
                        lng: nextPlace.lng!,
                      }}
                      onShowTransitGuide={
                        hasCoords ? onShowTransitGuide : undefined
                      }
                    />
                  );
                }
                return items;
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

// ==================== 路线信息徽章 ====================

function RouteBadge({
  route,
  loading,
  hasCoords,
  origin,
  destination,
  onShowTransitGuide,
}: {
  route: RouteInfo | null;
  loading: boolean;
  hasCoords: boolean;
  origin: { name: string; lat: number; lng: number };
  destination: { name: string; lat: number; lng: number };
  onShowTransitGuide?: (
    origin: { name: string; lat: number; lng: number },
    destination: { name: string; lat: number; lng: number },
    estimate: { distance: number; duration: number }
  ) => void;
}) {
  // 两地点中任一缺少坐标，不显示路线
  if (!hasCoords) return null;

  // 正在加载路线
  if (loading && !route) {
    return (
      <div className="flex items-center justify-center gap-1.5 py-0.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>计算路线...</span>
      </div>
    );
  }

  if (!route) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 py-0.5 text-xs text-muted-foreground">
      <div className="h-px w-3 bg-border" />
      <ArrowDown className="h-3 w-3" />
      <span>{formatDistance(route.distance)}</span>
      <span>·</span>
      <span>{formatTravelTime(route.duration)}</span>
      {onShowTransitGuide && (
        <button
          onClick={() =>
            onShowTransitGuide(
              origin,
              destination,
              { distance: route.distance, duration: route.duration }
            )
          }
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
          aria-label={`查看从${origin.name}到${destination.name}的乘车方案`}
        >
          <Navigation className="h-3 w-3" />
          乘车方案
        </button>
      )}
      <div className="h-px w-3 bg-border" />
    </div>
  );
}
