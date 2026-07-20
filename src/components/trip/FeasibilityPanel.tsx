"use client";

/**
 * 行程可行性面板
 *
 * 灵感来源：
 * - Rutugo：可行性校验，用问题列表展示行程风险
 * - Sygic Travel：每日强度评估，用颜色和图标直观呈现紧凑度
 *
 * 展示内容：
 * 1. 总体可行性评分（0-100）+ 通过/未通过标识
 * 2. 每日强度卡片（轻松/适中/紧张/过载）
 * 3. 问题清单（error / warning 分级）
 */

import { useMemo, useState } from "react";
import type { Place, Trip } from "@/types";
import {
  analyzeTripFeasibility,
  getIntensityConfig,
  type IntensityLevel,
} from "@/lib/feasibility";
import { daysBetween, formatDuration } from "@/lib/utils";
import { Badge } from "@/components/ui";
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Leaf,
  Activity,
  Zap,
  MapPin,
  Clock,
  Route,
} from "lucide-react";

const INTENSITY_ICONS: Record<IntensityLevel, typeof Leaf> = {
  relaxed: Leaf,
  moderate: Activity,
  tight: Zap,
  overloaded: AlertTriangle,
};

interface FeasibilityPanelProps {
  trip: Trip;
  places: Place[];
}

export function FeasibilityPanel({ trip, places }: FeasibilityPanelProps) {
  const [expanded, setExpanded] = useState(true);

  const totalDays = useMemo(
    () => daysBetween(trip.startDate, trip.endDate),
    [trip.startDate, trip.endDate]
  );

  const feasibility = useMemo(
    () => analyzeTripFeasibility(places, totalDays),
    [places, totalDays]
  );

  // 没有地点时不显示
  if (places.length === 0) return null;

  const errorCount = feasibility.issues.filter((i) => i.severity === "error").length;
  const warningCount = feasibility.issues.filter((i) => i.severity === "warning").length;

  // 评分颜色
  const scoreColor =
    feasibility.score >= 80
      ? "#10b981"
      : feasibility.score >= 60
      ? "#f59e0b"
      : "#ef4444";

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* 头部：评分总览 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-secondary/50"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-4">
          {/* 评分圆环 */}
          <div className="relative flex h-14 w-14 items-center justify-center">
            <svg className="h-14 w-14 -rotate-90" viewBox="0 0 56 56">
              <circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                className="text-muted/30"
              />
              <circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                stroke={scoreColor}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${(feasibility.score / 100) * 150.8} 150.8`}
              />
            </svg>
            <span
              className="absolute text-sm font-bold"
              style={{ color: scoreColor }}
            >
              {feasibility.score}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">行程可行性分析</h3>
              {feasibility.passed ? (
                <Badge variant="success">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  通过
                </Badge>
              ) : (
                <Badge variant="danger">
                  <AlertCircle className="mr-1 h-3 w-3" />
                  需调整
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {errorCount > 0 && `${errorCount} 个严重问题 · `}
              {warningCount > 0 && `${warningCount} 个提醒 · `}
              {totalDays} 天行程
            </p>
          </div>
        </div>

        {expanded ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      {/* 展开内容 */}
      {expanded && (
        <div className="border-t border-border p-5 space-y-5">
          {/* 每日强度卡片 */}
          <div>
            <h4 className="mb-3 text-sm font-medium text-muted-foreground">
              每日行程强度
            </h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {feasibility.days.map((day) => {
                const config = getIntensityConfig(day.intensity);
                const Icon = INTENSITY_ICONS[day.intensity];
                return (
                  <div
                    key={day.dayIndex}
                    className="rounded-lg border border-border p-3"
                    style={{ backgroundColor: config.bgColor }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        第 {day.dayIndex + 1} 天
                      </span>
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ color: config.color, backgroundColor: `${config.color}20` }}
                      >
                        <Icon className="h-3 w-3" />
                        {config.label}
                      </span>
                    </div>
                    {day.placeCount > 0 ? (
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3" />
                          {day.placeCount} 个地点
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          活动 {formatDuration(Math.round(day.totalActiveMinutes))}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Route className="h-3 w-3" />
                          通勤 {(day.totalCommuteDistance / 1000).toFixed(1)}km
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">
                        暂无安排
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 问题清单 */}
          {feasibility.issues.length > 0 && (
            <div>
              <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                发现的问题（{feasibility.issues.length}）
              </h4>
              <div className="space-y-2">
                {feasibility.issues.map((issue, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm"
                  >
                    {issue.severity === "error" ? (
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    )}
                    <div>
                      <p>{issue.message}</p>
                      {issue.placeNames && issue.placeNames.length > 0 && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          涉及：{issue.placeNames.join(" → ")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {feasibility.issues.length === 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 p-3 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>行程安排合理，未发现可行性问题</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
