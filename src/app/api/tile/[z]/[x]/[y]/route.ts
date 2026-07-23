import { NextRequest, NextResponse } from "next/server";

/**
 * 地图瓦片代理
 *
 * 绕过 Chromium ORB（Opaque Response Blocking）和 CORS 限制。
 * 客户端 Leaflet 直接请求瓦片会被 ORB 拦截，
 * 通过服务端代理后，响应变为同源，不再受 ORB 影响。
 *
 * 路由：/api/tile/{z}/{x}/{y}?source=osm|amap
 *
 * 瓦片源策略：
 * - 仅使用 OpenStreetMap 瓦片源（source 默认为 osm）
 * - source=amap 出于历史兼容性保留，收到时同样走 OSM
 * - 不再请求高德瓦片，也不再伪造浏览器 UA / Referer
 */

// OpenStreetMap 瓦片
const OSM_URL = (z: number, x: number, y: number) =>
  `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

// 1x1 透明 PNG（Leaflet 不会反复重试）
const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);

// 内存缓存仅是同一 serverless 实例内的短期优化：同时限制时间、条目数和字节数。
// Vercel 实例会复用进程；没有 TTL 的模块级 Map 会在高流量下持续占用内存。
export const TILE_CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES = 200;
const CACHE_MAX_BYTES = 16 * 1024 * 1024;
const MAX_CACHEABLE_TILE_BYTES = 512 * 1024;

interface CachedTile {
  data: ArrayBuffer;
  contentType: string;
  expiresAt: number;
}

const tileCache = new Map<string, CachedTile>();
let cachedBytes = 0;

/**
 * 请求上游瓦片，失败返回 null
 */
async function fetchUpstream(url: string): Promise<{ data: ArrayBuffer; contentType: string } | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/png";
    if (!contentType.startsWith("image/")) return null;
    const data = await res.arrayBuffer();
    return { data, contentType };
  } catch {
    return null;
  }
}

/**
 * 读取缓存，并删除过期条目。
 */
function takeCache(key: string): CachedTile | undefined {
  const cached = tileCache.get(key);
  if (!cached) return undefined;
  if (cached.expiresAt <= Date.now()) {
    tileCache.delete(key);
    cachedBytes -= cached.data.byteLength;
    return undefined;
  }
  // 刷新插入顺序，维持简单 LRU。
  tileCache.delete(key);
  tileCache.set(key, cached);
  return cached;
}

function removeOldestCacheEntry() {
  const firstKey = tileCache.keys().next().value;
  if (firstKey) {
    const first = tileCache.get(firstKey);
    if (first) cachedBytes -= first.data.byteLength;
    tileCache.delete(firstKey);
  }
}

/** 写入受限缓存；大瓦片仍会返回给当前用户，但不保留在实例内存中。 */
function putCache(key: string, value: { data: ArrayBuffer; contentType: string }) {
  if (value.data.byteLength > MAX_CACHEABLE_TILE_BYTES) return;

  const existing = tileCache.get(key);
  if (existing) {
    cachedBytes -= existing.data.byteLength;
    tileCache.delete(key);
  }

  while (
    tileCache.size >= CACHE_MAX_ENTRIES ||
    cachedBytes + value.data.byteLength > CACHE_MAX_BYTES
  ) {
    if (tileCache.size === 0) return;
    removeOldestCacheEntry();
  }

  tileCache.set(key, {
    ...value,
    expiresAt: Date.now() + TILE_CACHE_TTL_MS,
  });
  cachedBytes += value.data.byteLength;
}

function responseFromTile(tile: { data: ArrayBuffer; contentType: string }) {
  return new NextResponse(tile.data, {
    headers: {
      "Content-Type": tile.contentType,
      "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ z: string; x: string; y: string }> }
) {
  const { z: zStr, x: xStr, y: yStr } = await params;
  const z = Number(zStr);
  const x = Number(xStr);
  const y = Number(yStr);

  // Web Mercator 瓦片索引：每级最多 2^z 个 x/y 值。
  // 使用 Number + 整数检查，避免 parseInt 接受 "1abc" 等部分数字输入。
  const maxTileIndex = Number.isInteger(z) && z >= 0 && z <= 22 ? 2 ** z - 1 : -1;
  if (
    !Number.isInteger(z) ||
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    maxTileIndex < 0 ||
    x < 0 ||
    y < 0 ||
    x > maxTileIndex ||
    y > maxTileIndex
  ) {
    return NextResponse.json({ error: "Invalid tile coordinates" }, { status: 400 });
  }

  const rawSource = new URL(request.url).searchParams.get("source") ?? "osm";
  // 出于历史兼容性保留 amap 入参，但实际统一走 OSM。
  if (rawSource !== "amap" && rawSource !== "osm") {
    return NextResponse.json({ error: "Invalid tile source" }, { status: 400 });
  }
  // 归一化为 osm，保证缓存键一致、避免重复回源。
  const effectiveSource = "osm";
  const cacheKey = `${effectiveSource}/${z}/${x}/${y}`;

  // 命中缓存
  const cached = takeCache(cacheKey);
  if (cached) {
    return responseFromTile(cached);
  }

  // 仅使用 OSM 瓦片源
  const result = await fetchUpstream(OSM_URL(z, x, y));

  // 全部失败：返回透明 PNG，避免 Leaflet 反复重试
  if (!result) {
    return new NextResponse(TRANSPARENT_PNG, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  }

  putCache(cacheKey, result);
  return responseFromTile(result);
}
