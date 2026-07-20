import { NextRequest, NextResponse } from "next/server";
import { estimateCommute } from "@/lib/haversine";

/**
 * 路线规划代理
 *
 * 接受多个坐标点，返回每段路线的距离和时长。
 *
 * 策略：
 * 1. 首次请求尝试 OSRM 公共 API（5s 超时）
 * 2. 若 OSRM 不可达，缓存失败状态，后续请求直接使用估算
 * 3. 估算模型：Haversine 直线距离 × 弯曲系数 1.3 + 分段速度
 *    （详见 lib/haversine.ts）
 */

const OSRM_BASE = "https://router.project-osrm.net/route/v1";
const MAX_ROUTE_POINTS = 25;

/** 缓存 OSRM 可用性，避免每段都等 5s 超时 */
let osrmAvailable: boolean | null = null;

interface SegmentResult {
  distance: number; // 米
  duration: number; // 秒
  geometry: number[][]; // [lat, lng][] 或空数组
}

function isValidCoordinate(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/** 估算单段路线 */
function estimateSegment(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): SegmentResult {
  const { distance, duration } = estimateCommute(lat1, lng1, lat2, lng2);
  return { distance, duration, geometry: [] };
}

/** 尝试 OSRM 单段查询 */
async function tryOSRMSegment(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): Promise<SegmentResult | null> {
  const coordStr = `${lng1},${lat1};${lng2},${lat2}`;
  const url = `${OSRM_BASE}/driving/${coordStr}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.length) return null;

    const route = data.routes[0];
    return {
      distance: route.distance,
      duration: route.duration,
      geometry: route.geometry.coordinates.map(
        (c: [number, number]) => [c[1], c[0]] // [lng,lat] → [lat,lng]
      ),
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const coordsParam = searchParams.get("coords");

  if (!coordsParam) {
    return NextResponse.json(
      { error: "Missing coords parameter" },
      { status: 400 }
    );
  }

  // 解析坐标: "lat1,lng1;lat2,lng2;..."。限制点数，避免公共代理被滥用。
  const pairs = coordsParam.split(";");
  if (pairs.length > MAX_ROUTE_POINTS) {
    return NextResponse.json(
      { error: `A maximum of ${MAX_ROUTE_POINTS} route points is supported` },
      { status: 400 }
    );
  }

  const coords: [number, number][] = [];
  for (const pair of pairs) {
    const values = pair.split(",");
    if (values.length !== 2 || values.some((value) => !value.trim())) {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }
    const [lat, lng] = values.map(Number);
    if (!isValidCoordinate(lat, lng)) {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }
    coords.push([lat, lng]);
  }

  if (coords.length < 2) {
    return NextResponse.json({ routes: [] });
  }

  // 生成各段
  const segments: [number, number][] = [];
  for (let i = 0; i < coords.length - 1; i++) {
    segments.push([i, i + 1]);
  }

  // OSRM 已知不可用 → 直接估算
  if (osrmAvailable === false) {
    const results = segments.map(([i, j]) =>
      estimateSegment(coords[i][0], coords[i][1], coords[j][0], coords[j][1])
    );
    return NextResponse.json({ source: "estimate", routes: results });
  }

  // 尝试 OSRM（并行查询各段）
  const osrmResults = await Promise.all(
    segments.map(async ([i, j]) => {
      return tryOSRMSegment(
        coords[i][0],
        coords[i][1],
        coords[j][0],
        coords[j][1]
      );
    })
  );

  // 检查 OSRM 是否全部成功
  const allSuccess = osrmResults.every((r) => r !== null);

  if (allSuccess) {
    osrmAvailable = true;
    return NextResponse.json({
      source: "osrm",
      routes: osrmResults,
    });
  }

  // OSRM 部分或全部失败 → 标记不可用，使用估算
  osrmAvailable = false;
  const results = segments.map(([i, j]) =>
    estimateSegment(coords[i][0], coords[i][1], coords[j][0], coords[j][1])
  );
  return NextResponse.json({ source: "estimate", routes: results });
}
