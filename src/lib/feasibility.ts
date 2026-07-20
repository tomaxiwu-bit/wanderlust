/**
 * 行程可行性校验与每日强度评估模块
 *
 * 灵感来源：
 * - Rutugo 的 feasibility check 系统：校验行程在时间与地理上的合理性
 * - Sygic Travel 的每日行程强度评估：量化每日安排的紧凑程度
 *
 * 依赖：haversine.ts 的 estimateCommute 进行无网络通勤估算
 */

import type { Place } from "@/types";
import { estimateCommute, haversine } from "./haversine";

// ==================== 常量阈值 ====================

/** 单日合理活动时长上限（分钟）—— 12 小时 */
const MAX_DAILY_ACTIVE_MINUTES = 12 * 60;

/** 单日地点数量上限 —— 超过则视为过载 */
const MAX_PLACES_PER_DAY = 8;

/** 相邻地点直线距离预警阈值（米）—— 50km */
const LONG_GAP_THRESHOLD_M = 50_000;

/** 相邻地点直线距离严重阈值（米）—— 150km，通常无法当日往返 */
const SEVERE_GAP_THRESHOLD_M = 150_000;

// ==================== 类型定义 ====================

/** 强度等级 */
export type IntensityLevel = "relaxed" | "moderate" | "tight" | "overloaded";

/** 强度等级配置 */
export const INTENSITY_CONFIG: Record<
  IntensityLevel,
  { label: string; color: string; bgColor: string; icon: string; desc: string }
> = {
  relaxed: {
    label: "轻松",
    color: "#10b981",
    bgColor: "#10b98120",
    icon: "Leaf",
    desc: "行程宽松，有充足时间游览",
  },
  moderate: {
    label: "适中",
    color: "#3b82f6",
    bgColor: "#3b82f620",
    icon: "Activity",
    desc: "节奏适中，推荐安排",
  },
  tight: {
    label: "紧张",
    color: "#f59e0b",
    bgColor: "#f59e0b20",
    icon: "Zap",
    desc: "行程紧凑，注意时间管理",
  },
  overloaded: {
    label: "过载",
    color: "#ef4444",
    bgColor: "#ef444420",
    icon: "AlertTriangle",
    desc: "安排过满，建议拆分或删减",
  },
};

/** 单日行程分析结果 */
export interface DayAnalysis {
  dayIndex: number;
  /** 地点数量 */
  placeCount: number;
  /** 总停留时长（分钟） */
  totalStayMinutes: number;
  /** 总通勤时长（分钟） */
  totalCommuteMinutes: number;
  /** 总通勤距离（米） */
  totalCommuteDistance: number;
  /** 总活动时长 = 停留 + 通勤（分钟） */
  totalActiveMinutes: number;
  /** 强度等级 */
  intensity: IntensityLevel;
  /** 最远相邻距离（米） */
  maxGapDistance: number;
  /** 地点列表（含坐标） */
  places: Place[];
}

/** 单条可行性问题 */
export interface FeasibilityIssue {
  dayIndex: number;
  /** 问题级别 */
  severity: "warning" | "error";
  /** 问题类型 */
  type:
    | "too_many_places"
    | "time_overflow"
    | "long_gap"
    | "severe_gap"
    | "no_coords"
    | "empty_day";
  /** 人类可读描述 */
  message: string;
  /** 关联地点名称（可选） */
  placeNames?: string[];
}

/** 完整行程分析结果 */
export interface TripFeasibility {
  /** 按天分析 */
  days: DayAnalysis[];
  /** 发现的问题列表 */
  issues: FeasibilityIssue[];
  /** 总体可行性评分 0-100 */
  score: number;
  /** 是否通过校验（无 error 级别问题） */
  passed: boolean;
}

// ==================== 核心逻辑 ====================

/**
 * 计算单日行程的强度等级
 *
 * 综合考虑：地点数量、总活动时长、通勤距离
 */
export function calculateIntensity(
  placeCount: number,
  totalActiveMinutes: number,
  totalCommuteDistance: number
): IntensityLevel {
  // 过载：任一指标超限
  if (
    placeCount > MAX_PLACES_PER_DAY ||
    totalActiveMinutes > MAX_DAILY_ACTIVE_MINUTES ||
    totalCommuteDistance > 60_000
  ) {
    return "overloaded";
  }

  // 紧张：6-8 个地点，或 9-12 小时活动，或 30-60km 通勤
  if (
    placeCount >= 6 ||
    totalActiveMinutes > 9 * 60 ||
    totalCommuteDistance > 30_000
  ) {
    return "tight";
  }

  // 适中：4-5 个地点，或 6-9 小时活动，或 10-30km 通勤
  if (
    placeCount >= 4 ||
    totalActiveMinutes > 6 * 60 ||
    totalCommuteDistance > 10_000
  ) {
    return "moderate";
  }

  // 轻松：其余情况
  return "relaxed";
}

/**
 * 分析单日行程
 * @param places 当天地点列表（已按 order 排序）
 */
export function analyzeDay(places: Place[]): DayAnalysis {
  const sorted = [...places].sort((a, b) => a.order - b.order);
  const placeCount = sorted.length;

  let totalStayMinutes = 0;
  let totalCommuteMinutes = 0;
  let totalCommuteDistance = 0;
  let maxGapDistance = 0;

  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    totalStayMinutes += p.stayMinutes ?? 60;

    // 计算与前一地点的通勤
    if (i > 0) {
      const prev = sorted[i - 1];
      if (
        prev.lat != null &&
        prev.lng != null &&
        p.lat != null &&
        p.lng != null
      ) {
        const commute = estimateCommute(prev.lat, prev.lng, p.lat, p.lng);
        totalCommuteMinutes += commute.duration / 60;
        totalCommuteDistance += commute.distance;

        const straight = haversine(prev.lat, prev.lng, p.lat, p.lng);
        if (straight > maxGapDistance) maxGapDistance = straight;
      }
    }
  }

  const totalActiveMinutes = totalStayMinutes + totalCommuteMinutes;
  const intensity = calculateIntensity(
    placeCount,
    totalActiveMinutes,
    totalCommuteDistance
  );

  return {
    dayIndex: sorted[0]?.dayIndex ?? 0,
    placeCount,
    totalStayMinutes,
    totalCommuteMinutes,
    totalCommuteDistance,
    totalActiveMinutes,
    intensity,
    maxGapDistance,
    places: sorted,
  };
}

/**
 * 分析整段行程的可行性
 * @param places 所有地点
 * @param totalDays 总天数
 */
export function analyzeTripFeasibility(
  places: Place[],
  totalDays: number
): TripFeasibility {
  const days: DayAnalysis[] = [];
  const issues: FeasibilityIssue[] = [];

  for (let day = 0; day < totalDays; day++) {
    const dayPlaces = places
      .filter((p) => p.dayIndex === day)
      .sort((a, b) => a.order - b.order);

    // 空天检测
    if (dayPlaces.length === 0) {
      issues.push({
        dayIndex: day,
        severity: "warning",
        type: "empty_day",
        message: `第 ${day + 1} 天没有安排任何地点`,
      });
      days.push({
        dayIndex: day,
        placeCount: 0,
        totalStayMinutes: 0,
        totalCommuteMinutes: 0,
        totalCommuteDistance: 0,
        totalActiveMinutes: 0,
        intensity: "relaxed",
        maxGapDistance: 0,
        places: [],
      });
      continue;
    }

    const analysis = analyzeDay(dayPlaces);
    days.push(analysis);

    // 地点过多
    if (analysis.placeCount > MAX_PLACES_PER_DAY) {
      issues.push({
        dayIndex: day,
        severity: "error",
        type: "too_many_places",
        message: `第 ${day + 1} 天安排了 ${analysis.placeCount} 个地点，超过推荐的 ${MAX_PLACES_PER_DAY} 个上限`,
        placeNames: dayPlaces.map((p) => p.name),
      });
    }

    // 时间溢出
    if (analysis.totalActiveMinutes > MAX_DAILY_ACTIVE_MINUTES) {
      issues.push({
        dayIndex: day,
        severity: "error",
        type: "time_overflow",
        message: `第 ${day + 1} 天总活动时长 ${Math.round(
          analysis.totalActiveMinutes / 60
        )} 小时，超过 12 小时上限`,
      });
    }

    // 坐标缺失
    const noCoordPlaces = dayPlaces.filter(
      (p) => p.lat == null || p.lng == null
    );
    if (noCoordPlaces.length > 0) {
      issues.push({
        dayIndex: day,
        severity: "warning",
        type: "no_coords",
        message: `第 ${day + 1} 天有 ${noCoordPlaces.length} 个地点缺少坐标，无法精确计算通勤`,
        placeNames: noCoordPlaces.map((p) => p.name),
      });
    }

    // 相邻距离检测
    for (let i = 1; i < dayPlaces.length; i++) {
      const prev = dayPlaces[i - 1];
      const curr = dayPlaces[i];
      if (
        prev.lat != null &&
        prev.lng != null &&
        curr.lat != null &&
        curr.lng != null
      ) {
        const straight = haversine(prev.lat, prev.lng, curr.lat, curr.lng);
        if (straight > SEVERE_GAP_THRESHOLD_M) {
          issues.push({
            dayIndex: day,
            severity: "error",
            type: "severe_gap",
            message: `第 ${day + 1} 天「${prev.name}」到「${curr.name}」直线距离 ${(
              straight / 1000
            ).toFixed(0)}km，当日往返极不现实`,
            placeNames: [prev.name, curr.name],
          });
        } else if (straight > LONG_GAP_THRESHOLD_M) {
          issues.push({
            dayIndex: day,
            severity: "warning",
            type: "long_gap",
            message: `第 ${day + 1} 天「${prev.name}」到「${curr.name}」直线距离 ${(
              straight / 1000
            ).toFixed(0)}km，通勤时间较长`,
            placeNames: [prev.name, curr.name],
          });
        }
      }
    }
  }

  // 计算总体评分
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const score = Math.max(
    0,
    100 - errorCount * 20 - warningCount * 5
  );

  return {
    days,
    issues,
    score,
    passed: errorCount === 0,
  };
}

/**
 * 获取强度等级的安全查询
 */
export function getIntensityConfig(level: string): typeof INTENSITY_CONFIG[IntensityLevel] {
  return INTENSITY_CONFIG[level as IntensityLevel] ?? INTENSITY_CONFIG.relaxed;
}
