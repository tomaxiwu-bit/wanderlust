"use client";

/**
 * 智能规划弹窗
 *
 * 用户流程：
 * 1. 通过 PlaceSearch 搜索并添加地点到心愿单
 * 2. 设置每天游览景点数
 * 3. 点击"自动安排"，按最近邻算法优化顺序并按天分组
 * 4. 结果通过 onPlan 回传给父组件写入 store
 *
 * 若已存在地点，点击"自动安排"会先弹 confirm 确认覆盖。
 */

import { useState, useMemo, useEffect } from "react";
import { Modal, Button, FormField } from "@/components/ui";
import { PlaceSearch } from "./PlaceSearch";
import {
  planItinerary,
  planItineraryWithCommute,
  type PlannerPlace,
} from "@/lib/planner";
import { formatDistance, formatTravelTime } from "@/lib/routing";
import { PLACE_TYPES } from "@/lib/constants";
import { confirm } from "@/components/ui/ConfirmDialog";
import {
  Sparkles,
  Trash2,
  MapPin,
  Clock,
  ListChecks,
  ArrowRight,
  Route as RouteIcon,
} from "lucide-react";
import type { PlaceType } from "@/types";

interface SmartPlannerModalProps {
  open: boolean;
  onClose: () => void;
  onPlan: (days: PlannerPlace[][]) => void;
  /** 当前行程已有的地点数，用于覆盖前提示 */
  existingPlaceCount: number;
}

export function SmartPlannerModal({
  open,
  onClose,
  onPlan,
  existingPlaceCount,
}: SmartPlannerModalProps) {
  const [wishlist, setWishlist] = useState<PlannerPlace[]>([]);
  const [placesPerDay, setPlacesPerDay] = useState<number>(4);
  const [arranging, setArranging] = useState(false);

  // 每次打开弹窗时重置状态，避免上次残留
  useEffect(() => {
    if (open) {
      setWishlist([]);
      setPlacesPerDay(4);
      setArranging(false);
    }
  }, [open]);

  // 预览：按当前设置分组后的规划（含通勤信息）
  const plannedDays = useMemo(
    () => planItineraryWithCommute(wishlist, placesPerDay),
    [wishlist, placesPerDay]
  );

  const handleAddPlace = (place: {
    name: string;
    type: PlaceType;
    address: string;
    lat: number;
    lng: number;
  }) => {
    // 去重：同名 + 同坐标视为重复
    const duplicate = wishlist.some(
      (p) =>
        p.name === place.name &&
        p.lat === place.lat &&
        p.lng === place.lng
    );
    if (duplicate) return;
    setWishlist((prev) => [
      ...prev,
      {
        name: place.name,
        type: place.type,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
      },
    ]);
  };

  const handleRemove = (index: number) => {
    setWishlist((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    setWishlist([]);
  };

  const handleArrange = async () => {
    if (wishlist.length === 0) return;

    // 已有地点时，提示用户将被覆盖
    if (existingPlaceCount > 0) {
      const ok = await confirm({
        title: "覆盖现有行程？",
        description: `当前行程已有 ${existingPlaceCount} 个地点，自动安排将清空这些地点并重新生成日程，此操作不可撤销。`,
        confirmText: "覆盖并安排",
        variant: "danger",
      });
      if (!ok) return;
    }

    setArranging(true);
    try {
      const days = planItinerary(wishlist, placesPerDay);
      onPlan(days);
    } finally {
      setArranging(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="智能规划"
      description="搜索想去的地点，系统将按地理位置自动安排每日行程"
      size="lg"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            取消
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={arranging}
            disabled={wishlist.length === 0}
            leftIcon={<Sparkles className="h-4 w-4" />}
            onClick={handleArrange}
          >
            自动安排
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* 搜索区 */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            搜索地点
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              （选择后自动加入心愿单）
            </span>
          </label>
          <PlaceSearch
            onSelect={handleAddPlace}
            placeholder="搜索想去的景点，如：东京塔、浅草寺..."
          />
        </div>

        {/* 心愿单列表 */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <ListChecks className="h-4 w-4 text-primary" />
              心愿单
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                {wishlist.length}
              </span>
            </div>
            {wishlist.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs text-muted-foreground transition-colors hover:text-destructive"
              >
                清空
              </button>
            )}
          </div>

          {wishlist.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8 text-center text-muted-foreground">
              <MapPin className="mb-2 h-8 w-8" />
              <p className="text-sm">还没有添加地点</p>
              <p className="mt-1 text-xs">在上方搜索框中搜索并选择地点</p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {wishlist.map((place, index) => {
                const config = PLACE_TYPES[place.type];
                return (
                  <li
                    key={`${place.name}-${index}`}
                    className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground">
                      {index + 1}
                    </span>
                    <MapPin
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {place.name}
                      </p>
                      {place.address && (
                        <p className="truncate text-xs text-muted-foreground">
                          {place.address}
                        </p>
                      )}
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: `${config.color}20`,
                        color: config.color,
                      }}
                    >
                      {config.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemove(index)}
                      className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`移除 ${place.name}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* 每天游览景点数 */}
        <FormField label="每天游览景点数" hint="范围 1 ~ 10，超出将自动限制">
          {({ id }) => (
            <input
              id={id}
              type="number"
              min={1}
              max={10}
              value={placesPerDay}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                if (Number.isFinite(n)) {
                  setPlacesPerDay(Math.max(1, Math.min(n, 10)));
                } else {
                  setPlacesPerDay(4);
                }
              }}
              className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          )}
        </FormField>

        {/* 行程预览（含通勤时间） */}
        {wishlist.length > 0 && (
          <div className="space-y-3">
            {/* 汇总信息 */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <ListChecks className="h-4 w-4 shrink-0" />
                <strong className="text-foreground">{wishlist.length}</strong> 个地点
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 shrink-0" />
                <strong className="text-foreground">{plannedDays.length}</strong> 天
              </span>
              {existingPlaceCount > 0 && (
                <span className="text-destructive">
                  将覆盖现有 {existingPlaceCount} 个地点
                </span>
              )}
            </div>

            {/* 每日行程预览 */}
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {plannedDays.map((day, dayIdx) => (
                <div
                  key={dayIdx}
                  className="rounded-lg border border-border bg-background p-3"
                >
                  {/* 日期标题 */}
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">
                      第 {dayIdx + 1} 天
                    </span>
                    {day.totalDuration > 0 && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <RouteIcon className="h-3 w-3" />
                        通勤 {formatTravelTime(day.totalDuration)} ·{" "}
                        {formatDistance(day.totalDistance)}
                      </span>
                    )}
                  </div>

                  {/* 地点 + 通勤时间 */}
                  <div className="space-y-1">
                    {day.places.map((place, pIdx) => (
                      <div key={pIdx}>
                        {/* 地点名 */}
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-medium text-secondary-foreground">
                            {pIdx + 1}
                          </span>
                          <span className="truncate text-sm">
                            {place.name}
                          </span>
                          {place.stayMinutes ? (
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              停留 {place.stayMinutes}分钟
                            </span>
                          ) : null}
                        </div>
                        {/* 通勤时间（在两个地点之间） */}
                        {pIdx < day.places.length - 1 &&
                          day.commutes[pIdx] &&
                          day.commutes[pIdx].distance > 0 && (
                            <div className="flex items-center gap-1.5 py-0.5 pl-7 text-xs text-muted-foreground">
                              <ArrowRight className="h-3 w-3 rotate-90" />
                              <Clock className="h-3 w-3" />
                              <span>
                                {formatTravelTime(day.commutes[pIdx].duration)}
                              </span>
                              <span>·</span>
                              <span>
                                {formatDistance(day.commutes[pIdx].distance)}
                              </span>
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
