/**
 * 地理编码服务
 * 基于 Nominatim API（OpenStreetMap 免费服务）
 * 文档：https://nominatim.org/release-docs/latest/api/Search/
 *
 * 使用政策：
 * - 必须发送 User-Agent header
 * - 限频 1 次/秒
 * - 大量请求需提供 email
 *
 * 注意：浏览器直接请求 Nominatim 会因 User-Agent header 被禁用及 CORS
 * 问题导致 `net::ERR_ABORTED`。因此通过本地 Next.js API Route
 * (`/api/search`) 作为代理转发请求，由服务端附加必要的 header。
 */

const NOMINATIM_BASE = "/api/search";

/** 搜索结果项 */
export interface GeoSearchResult {
  placeId: number;
  name: string;
  displayName: string;
  lat: number;
  lon: number;
  type: string;
  category: string;
  address?: {
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    countryCode?: string;
    postcode?: string;
  };
}

/**
 * 搜索地点
 * @param query 搜索关键词，如 "东京塔" 或 "Tokyo Tower"
 * @param options 可选参数
 * @returns 搜索结果列表
 */
export async function searchPlaces(
  query: string,
  options: {
    limit?: number;
    countrycodes?: string; // ISO 3166-1 alpha-2，如 "jp,cn"
    viewbox?: string; // "x1,y1,x2,y2" 搜索区域
    signal?: AbortSignal;
  } = {}
): Promise<GeoSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const params = new URLSearchParams({
    q: trimmed,
    format: "json",
    addressdetails: "1",
    limit: (options.limit ?? 5).toString(),
    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
  });

  if (options.countrycodes) {
    params.set("countrycodes", options.countrycodes);
  }

  if (options.viewbox) {
    params.set("viewbox", options.viewbox);
  }

  const url = `${NOMINATIM_BASE}?${params.toString()}`;

  try {
    const res = await fetch(url, {
      signal: options.signal,
    });
    if (!res.ok) {
      console.error(`地点搜索代理错误: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = (await res.json()) as Array<{
      place_id: number;
      name?: string;
      display_name: string;
      lat: string;
      lon: string;
      type: string;
      class: string;
      address?: Record<string, string>;
    }>;

    return data.map((item) => ({
      placeId: item.place_id,
      name: item.name ?? item.display_name.split(",")[0],
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      type: item.type,
      category: item.class,
      address: item.address
        ? {
            road: item.address.road,
            city: item.address.city,
            town: item.address.town,
            village: item.address.village,
            state: item.address.state,
            country: item.address.country,
            countryCode: item.address.country_code,
            postcode: item.address.postcode,
          }
        : undefined,
    }));
  } catch (err) {
    console.error("地点搜索失败:", err);
    return [];
  }
}

/**
 * 根据地点名称推断地点类型（用于自动选择 PlaceType）
 * 基于 Nominatim 返回的 class/type 字段
 */
export function inferPlaceType(
  category: string,
  type: string
): "attraction" | "restaurant" | "hotel" | "transport" | "shopping" | "other" {
  // 景点
  if (
    category === "tourism" ||
    category === "historic" ||
    category === "leisure" ||
    type === "attraction" ||
    type === "viewpoint" ||
    type === "monument" ||
    type === "museum"
  ) {
    return "attraction";
  }

  // 餐厅
  if (
    category === "amenity" &&
    ["restaurant", "cafe", "bar", "fast_food", "pub", "food_court"].includes(
      type
    )
  ) {
    return "restaurant";
  }

  // 住宿
  if (
    category === "tourism" &&
    ["hotel", "hostel", "motel", "guest_house", "apartment"].includes(type)
  ) {
    return "hotel";
  }

  // 交通
  if (
    category === "amenity" &&
    ["parking", "fuel", "bus_station"].includes(type)
  ) {
    return "transport";
  }
  if (category === "railway" || type === "station") {
    return "transport";
  }

  // 购物
  if (category === "shop" || (category === "amenity" && type === "marketplace")) {
    return "shopping";
  }

  return "other";
}
