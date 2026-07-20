/**
 * 地理距离与通勤估算公共模块
 *
 * 统一了 Haversine 直线距离和城市通勤速度模型，
 * 消除 planner.ts / routing.ts / api/route / api/transit 之间的重复实现。
 */

/** 地球半径（米） */
const EARTH_RADIUS_M = 6371000;

/**
 * Haversine 公式：计算两个经纬度坐标之间的球面距离
 * @returns 距离（米）
 */
export function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_M * c;
}

/** 道路弯曲系数：实际路线约为直线的 1.3 倍 */
const BEND_FACTOR = 1.3;

/**
 * 城市出行分段速度模型（km/h）
 * 适用于公共交通为主的城市场景
 *   < 1km:  步行 5 km/h
 *   1-5km:  步行+公交 15 km/h
 *   5-20km: 地铁/公交 25 km/h
 *   > 20km: 快线/高速 35 km/h
 */
function speedForDistance(straightMeters: number): number {
  if (straightMeters < 1000) return 5;
  if (straightMeters < 5000) return 15;
  if (straightMeters < 20000) return 25;
  return 35;
}

/** 通勤估算结果 */
export interface CommuteEstimate {
  /** 实际路线距离（米，含弯曲系数） */
  distance: number;
  /** 预计通行时长（秒） */
  duration: number;
}

/**
 * 估算两地点之间的通勤距离和时长
 * 模型：Haversine 直线距离 × 弯曲系数 1.3 + 分段速度
 *
 * 无需网络请求，用于：
 * - planner.ts 的智能规划通勤预览
 * - routing.ts 的 OSRM 失败兜底
 * - api/route 的估算模式
 */
export function estimateCommute(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): CommuteEstimate {
  const straightM = haversine(lat1, lng1, lat2, lng2);
  const distance = straightM * BEND_FACTOR;
  const speed = speedForDistance(straightM);
  const duration = (distance / 1000 / speed) * 3600;

  return { distance, duration };
}

/**
 * 将坐标哈希为稳定的整数 ID
 * 用于替代 Math.random() 生成 place_id
 */
export function coordHash(lat: number, lng: number): number {
  // 将坐标放大到整数位，做简单哈希
  const latInt = Math.round(lat * 1e6);
  const lngInt = Math.round(lng * 1e6);
  // XOR-based hash，保持 32 位整数范围
  let hash = (latInt * 73856093) ^ (lngInt * 19349663);
  hash = hash ^ (hash >>> 16);
  return Math.abs(hash);
}
