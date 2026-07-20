import { NextRequest, NextResponse } from "next/server";
import { haversine } from "@/lib/haversine";

/**
 * 公共交通站点查询代理
 *
 * 通过 Overpass API 查询起终点附近的公共交通站点和线路。
 * Overpass API 从中国可能不可达，设置 8 秒超时，失败返回空数组。
 * 部署到海外服务器（如 Vercel）后可正常使用。
 */

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

interface TransitStop {
  name: string;
  lat: number;
  lng: number;
  lines: string[];
  type: string;
  distance: number; // 距起终点的距离（米）
}

interface TransitQueryResult {
  originStops: TransitStop[];
  destinationStops: TransitStop[];
}

function parseCoordinate(value: string): [number, number] | null {
  const parts = value.split(",");
  if (parts.length !== 2 || parts.some((part) => !part.trim())) return null;
  const [lat, lng] = parts.map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }
  return [lat, lng];
}

/**
 * 查询某坐标附近的公共交通站点
 * 返回站点列表（含线路名称）
 */
async function queryNearbyStops(
  lat: number,
  lng: number,
  radius: number = 800
): Promise<TransitStop[]> {
  // Overpass QL: 查询附近的火车站、地铁站、公交站
  const query = `
    [out:json][timeout:8];
    (
      node(around:${radius},${lat},${lng})["railway"="station"];
      node(around:${radius},${lat},${lng})["railway"="subway_entrance"];
      node(around:${radius},${lat},${lng})["station"="subway"];
      node(around:${radius},${lat},${lng})["public_transport"="station"];
      node(around:${radius},${lat},${lng})["public_transport"="stop_position"]["bus"="yes"];
    );
    out tags body;
  `;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) continue;
      const data = await res.json();
      if (!data.elements?.length) continue;

      // 获取站点 ID，用于查询所属线路
      const stopNodes = data.elements.filter(
        (el: { type: string; tags?: Record<string, string> }) =>
          el.type === "node" && el.tags?.name
      );

      if (stopNodes.length === 0) continue;

      // 查询这些站点所属的地铁/铁路线路
      const nodeIds = stopNodes
        .slice(0, 20)
        .map((el: { id: number }) => el.id)
        .join(",");

      const lineQuery = `
        [out:json][timeout:8];
        rel(bn(${nodeIds}))["route"~"subway|train|tram|light_rail|monorail"];
        out tags body;
      `;

      let lineMap: Record<number, string[]> = {};
      try {
        const lineRes = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `data=${encodeURIComponent(lineQuery)}`,
          signal: AbortSignal.timeout(8000),
        });

        if (lineRes.ok) {
          const lineData = await lineRes.json();
          // 注意：Overpass 的 rel(bn) 查询不直接关联 node 和 relation
          // 我们只能获取所有经过这些站点的线路名称
          const allLines: string[] = [];
          if (lineData.elements) {
            for (const rel of lineData.elements) {
              const name =
                rel.tags?.name || rel.tags?.ref || rel.tags?.operator || "";
              if (name) allLines.push(name);
            }
          }
          // 将所有线路分配给每个站点（简化处理）
          lineMap = stopNodes.reduce(
            (acc: Record<number, string[]>, el: { id: number }) => {
              acc[el.id] = allLines;
              return acc;
            },
            {}
          );
        }
      } catch {
        // 线路查询失败不影响站点显示
      }

      // 构建结果
      const stops: TransitStop[] = stopNodes
        .map((el: { id: number; lat: number; lon: number; tags?: Record<string, string> }) => {
          const name = el.tags?.name || el.tags?.name_en || "未知站";
          const stopLat = el.lat;
          const stopLng = el.lon;
          const lines = lineMap[el.id] || [];

          // 从 tags 中提取线路信息
          const lineFromTags: string[] = [];
          for (const [key, value] of Object.entries(el.tags || {})) {
            if (
              key.startsWith("line") ||
              key === "network" ||
              key === "operator"
            ) {
              if (value && !lineFromTags.includes(value)) {
                lineFromTags.push(value);
              }
            }
          }

          return {
            name,
            lat: stopLat,
            lng: stopLng,
            lines: lines.length > 0 ? lines : lineFromTags,
            type:
              el.tags?.railway ||
              el.tags?.station ||
              el.tags?.public_transport ||
              "station",
            distance: haversine(lat, lng, stopLat, stopLng),
          };
        })
        .sort((a: TransitStop, b: TransitStop) => a.distance - b.distance)
        .slice(0, 5);

      return stops;
    } catch {
      continue;
    }
  }

  return [];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = searchParams.get("origin"); // "lat,lng"
  const destination = searchParams.get("destination"); // "lat,lng"

  if (!origin || !destination) {
    return NextResponse.json(
      { error: "Missing origin or destination" },
      { status: 400 }
    );
  }

  const originCoordinate = parseCoordinate(origin);
  const destinationCoordinate = parseCoordinate(destination);

  if (!originCoordinate || !destinationCoordinate) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }
  const [origLat, origLng] = originCoordinate;
  const [destLat, destLng] = destinationCoordinate;

  // 并行查询起点和终点附近的站点
  const [originStops, destinationStops] = await Promise.all([
    queryNearbyStops(origLat, origLng),
    queryNearbyStops(destLat, destLng),
  ]);

  const result: TransitQueryResult = { originStops, destinationStops };

  // 如果查询成功（有结果），标记 source
  const source =
    originStops.length > 0 || destinationStops.length > 0
      ? "overpass"
      : "unavailable";

  return NextResponse.json({ source, ...result });
}
