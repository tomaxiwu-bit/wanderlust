import { NextRequest, NextResponse } from "next/server";

/**
 * 地图瓦片代理
 *
 * 绕过 Chromium ORB（Opaque Response Blocking）和 CORS 限制。
 * 客户端 Leaflet 直接请求高德瓦片会被 ORB 拦截，
 * 通过服务端代理后，响应变为同源，不再受 ORB 影响。
 *
 * 路由：/api/tile/{z}/{x}/{y}?source=amap|osm
 *
 * 容错策略：
 * - source=amap（默认）：先请求高德，失败/超时自动回退到 OSM
 * - source=osm：直接使用 OSM
 * - 高德瓦片在国内快，OSM 在全球可用，回退保证海外用户也能看到地图
 */

// 高德瓦片服务器（轮询子域名）
const AMAP_SUBDOMAINS = ["01", "02", "03", "04"];
const AMAP_URL = (sub: string, z: number, x: number, y: number) =>
  `https://webrd${sub}.is.autonavi.com/appmaptile?style=8&x=${x}&y=${y}&z=${z}`;

// OpenStreetMap 瓦片（备用）
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
      headers: {
        // 模拟正常浏览器请求，避免被瓦片服务器拒绝
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://www.amap.com/",
      },
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

  const source = new URL(request.url).searchParams.get("source") ?? "amap";
  if (source !== "amap" && source !== "osm") {
    return NextResponse.json({ error: "Invalid tile source" }, { status: 400 });
  }
  const cacheKey = `${source}/${z}/${x}/${y}`;

  // 命中缓存
  const cached = takeCache(cacheKey);
  if (cached) {
    return responseFromTile(cached);
  }

  // 1. 主源：高德（source=amap）或 OSM（source=osm）
  let primaryUrl: string;
  if (source === "osm") {
    primaryUrl = OSM_URL(z, x, y);
  } else {
    const sub = AMAP_SUBDOMAINS[Math.floor(Math.random() * AMAP_SUBDOMAINS.length)];
    primaryUrl = AMAP_URL(sub, z, x, y);
  }

  let result = await fetchUpstream(primaryUrl);

  // 2. 回退：高德失败时尝试 OSM（仅当主源是高德）
  if (!result && source !== "osm") {
    const fallbackKey = `osm/${z}/${x}/${y}`;
    const fallbackCached = takeCache(fallbackKey);
    if (fallbackCached) {
      result = fallbackCached;
    } else {
      const fallbackResult = await fetchUpstream(OSM_URL(z, x, y));
      if (fallbackResult) {
        putCache(fallbackKey, fallbackResult);
        result = fallbackResult;
      }
    }
  }

  // 3. 全部失败：返回透明 PNG，避免 Leaflet 反复重试
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
