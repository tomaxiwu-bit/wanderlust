import { NextRequest, NextResponse } from "next/server";
import { coordHash } from "@/lib/haversine";

/**
 * 地点搜索代理
 *
 * 策略：
 * 1. 使用 Photon API（Komoot）作为主搜索服务 —— 在中国网络环境下可访问
 * 2. Nominatim API 作为兜底（可能被墙，5s 超时后跳过）
 * 3. 当用户输入简体中文时，自动尝试：
 *    a) 常见景点的中→英/日翻译（内置字典）
 *    b) 简体→繁体转换（更好的日韩台地名匹配）
 * 4. 合并去重多个查询的结果
 *
 * 返回格式与 Nominatim 一致（兼容 geocode.ts 的解析逻辑）
 */

const PHOTON_BASE = "https://photon.komoot.io/api";
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";
const MAX_QUERY_LENGTH = 120;
const MAX_RESULTS = 10;

// ==================== 常见景点翻译字典 ====================
// 简体中文 → [英文/日文/当地语言名]（用于在 Photon/OSM 中匹配）
const LANDMARK_TRANSLATIONS: Record<string, string[]> = {
  // 日本
  "东京塔": ["Tokyo Tower", "東京タワー"],
  "东京晴空塔": ["Tokyo Skytree", "東京スカイツリー"],
  "天空树": ["Tokyo Skytree", "東京スカイツリー"],
  "东京迪士尼": ["Tokyo Disneyland", "東京ディズニーランド"],
  "迪士尼乐园": ["Disneyland"],
  "迪士尼海洋": ["Tokyo DisneySea", "東京ディズニーシー"],
  "浅草寺": ["Sensoji Temple", "浅草寺"],
  "明治神宫": ["Meiji Shrine", "明治神宮"],
  "皇居": ["Imperial Palace", "皇居"],
  "银座": ["Ginza", "銀座"],
  "新宿": ["Shinjuku", "新宿"],
  "涩谷": ["Shibuya", "渋谷"],
  "涩谷十字路口": ["Shibuya Crossing", "渋谷スクランブル交差点"],
  "秋叶原": ["Akihabara", "秋葉原"],
  "上野公园": ["Ueno Park", "上野公園"],
  "台场": ["Odaiba", "お台場"],
  "京都塔": ["Kyoto Tower", "京都タワー"],
  "清水寺": ["Kiyomizu-dera", "清水寺"],
  "金阁寺": ["Kinkaku-ji", "金閣寺"],
  "银阁寺": ["Ginkaku-ji", "銀閣寺"],
  "伏见稻荷大社": ["Fushimi Inari Taisha", "伏見稲荷大社"],
  "岚山": ["Arashiyama", "嵐山"],
  "大阪城": ["Osaka Castle", "大阪城"],
  "道顿堀": ["Dotonbori", "道頓堀"],
  "心斋桥": ["Shinsaibashi", "心斎橋"],
  "奈良公园": ["Nara Park", "奈良公園"],
  "富士山": ["Mount Fuji", "富士山"],
  // 韩国
  "首尔塔": ["N Seoul Tower", "N서울타워"],
  "南山塔": ["Namsan Tower", "남산타워"],
  "景福宫": ["Gyeongbokgung", "경복궁"],
  "明洞": ["Myeongdong", "명동"],
  "北村韩屋村": ["Bukchon Hanok Village", "북촌한옥마을"],
  "东大门": ["Dongdaemun", "동대문"],
  "广藏市场": ["Gwangjang Market", "광장시장"],
  // 东南亚
  "暹粒": ["Siem Reap"],
  "吴哥窟": ["Angkor Wat"],
  "普吉岛": ["Phuket"],
  "芭东海滩": ["Patong Beach"],
  "巴厘岛": ["Bali"],
  "库塔海滩": ["Kuta Beach"],
  // 欧洲
  "埃菲尔铁塔": ["Eiffel Tower", "Tour Eiffel"],
  "卢浮宫": ["Louvre Museum", "Musée du Louvre"],
  "凯旋门": ["Arc de Triomphe"],
  "巴黎圣母院": ["Notre-Dame de Paris"],
  "凡尔赛宫": ["Palace of Versailles", "Château de Versailles"],
  "大本钟": ["Big Ben"],
  "伦敦塔桥": ["Tower Bridge"],
  "伦敦眼": ["London Eye"],
  "白金汉宫": ["Buckingham Palace"],
  "威斯敏斯特教堂": ["Westminster Abbey"],
  "巨石阵": ["Stonehenge"],
  "斗兽场": ["Colosseum", "Colosseo"],
  "许愿池": ["Trevi Fountain", "Fontana di Trevi"],
  "万神殿": ["Pantheon"],
  "西班牙广场": ["Piazza di Spagna", "Plaza de España"],
  "圣家族大教堂": ["Sagrada Familia"],
  "巴特罗之家": ["Casa Batlló"],
  "米拉之家": ["Casa Milà"],
  "圣彼得大教堂": ["St. Peter's Basilica", "Basilica di San Pietro"],
  "红场": ["Red Square"],
  "克里姆林宫": ["Kremlin"],
  // 美洲
  "自由女神像": ["Statue of Liberty"],
  "帝国大厦": ["Empire State Building"],
  "时代广场": ["Times Square"],
  "中央公园": ["Central Park"],
  "布鲁克林大桥": ["Brooklyn Bridge"],
  "金门大桥": ["Golden Gate Bridge"],
  "好莱坞": ["Hollywood"],
  "环球影城": ["Universal Studios"],
  "大峡谷": ["Grand Canyon"],
  "尼亚加拉瀑布": ["Niagara Falls"],
  // 大洋洲
  "悉尼歌剧院": ["Sydney Opera House"],
  "悉尼海港大桥": ["Sydney Harbour Bridge"],
  // 中东/印度
  "泰姬陵": ["Taj Mahal"],
  "迪拜塔": ["Burj Khalifa"],
  "哈利法塔": ["Burj Khalifa"],
  // 中国港澳台
  "台北101": ["Taipei 101"],
  "故宫博物院": ["National Palace Museum"],
  "日月潭": ["Sun Moon Lake"],
  "太鲁阁": ["Taroko National Park"],
  "维多利亚港": ["Victoria Harbour"],
  "太平山顶": ["Victoria Peak"],
  "大三巴": ["Ruins of St. Paul's"],
};

// ==================== 简繁转换（用于日韩台地名匹配）====================
const SIMP_TO_TRAD: Record<string, string> = {
  "东": "東", "门": "門", "广": "廣", "场": "場", "桥": "橋",
  "园": "園", "国": "國", "馆": "館", "宫": "宮", "岛": "島",
  "厅": "廳", "坛": "壇", "观": "觀", "戏": "戲", "乐": "樂",
  "钟": "鐘", "铁": "鐵", "车": "車", "马": "馬", "龙": "龍",
  "鸟": "鳥", "鱼": "魚", "华": "華", "圣": "聖", "书": "書",
  "图": "圖", "庙": "廟", "楼": "樓", "饭": "飯", "购": "購",
  "业": "業", "营": "營", "务": "務", "驿": "驛", "区": "區",
  "湾": "灣", "头": "頭", "边": "邊", "关": "關", "产": "產",
  "从": "從", "仪": "儀", "会": "會", "伤": "傷", "价": "價",
  "众": "眾", "优": "優", "传": "傳", "侧": "側", "俭": "儉",
  "偿": "償", "倾": "傾", "仅": "僅", "远": "遠", "运": "運",
  "近": "近", "还": "還", "进": "進", "连": "連", "选": "選",
  "适": "適", "过": "過", "达": "達", "迟": "遲", "历": "歷",
  "志": "誌", "县": "縣", "号": "號", "条": "條", "处": "處",
  "员": "員", "证": "證", "识": "識",
};

function toTraditionalChinese(s: string): string {
  return s
    .split("")
    .map((c) => SIMP_TO_TRAD[c] || c)
    .join("");
}

function hasChinese(s: string): boolean {
  return /[\u4e00-\u9fff]/.test(s);
}

// ==================== 搜索结果类型（兼容 Nominatim 格式）====================
interface SearchResult {
  place_id: number;
  name?: string;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
  address?: Record<string, string>;
}

// ==================== Photon API 搜索 ====================
async function searchPhoton(
  query: string,
  limit: number
): Promise<SearchResult[]> {
  const url = `${PHOTON_BASE}/?q=${encodeURIComponent(query)}&limit=${limit}`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.features || !Array.isArray(data.features)) return [];

    return data.features.map(
      (f: {
        properties?: Record<string, string>;
        geometry?: { coordinates?: number[] };
      }): SearchResult => {
        const props = f.properties || {};
        const coords = f.geometry?.coordinates || [0, 0];
        const name = props.name || "";
        const parts = [
          name,
          props.street,
          props.district,
          props.locality,
          props.city,
          props.state,
          props.country,
        ].filter(Boolean);

        return {
          place_id: props.osm_id
            ? parseInt(props.osm_id, 10)
            : coordHash(coords[1] ?? 0, coords[0] ?? 0),
          name: name || parts[0] || "",
          display_name: parts.join(", "),
          lat: String(coords[1] ?? 0),
          lon: String(coords[0] ?? 0),
          type: props.osm_value || "",
          class: props.osm_key || "",
          address: {
            road: props.street,
            city: props.city,
            town: props.city,
            state: props.state,
            country: props.country,
            country_code: props.countrycode?.toLowerCase(),
            postcode: props.postcode,
          },
        };
      }
    );
  } catch {
    return [];
  }
}

// ==================== Nominatim API 搜索（兜底）====================
async function searchNominatim(
  query: string,
  limit: number
): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    addressdetails: "1",
    limit: String(limit),
    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
  });
  const url = `${NOMINATIM_BASE}?${params.toString()}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Wanderlust/1.0 (travel planner app)",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
      signal: AbortSignal.timeout(5000), // 短超时，因为它可能被墙
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// ==================== 主处理函数 ====================
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.trim().length < 2) {
    return NextResponse.json([]);
  }

  const requestedLimit = Number.parseInt(searchParams.get("limit") || "6", 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), MAX_RESULTS)
    : 6;
  const trimmedQuery = query.trim();
  if (trimmedQuery.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `Query must be no longer than ${MAX_QUERY_LENGTH} characters` },
      { status: 400 }
    );
  }

  // 构建查询列表：原始查询 + 翻译 + 繁体
  const queries: string[] = [trimmedQuery];

  if (hasChinese(trimmedQuery)) {
    // 1. 检查景点翻译字典
    if (LANDMARK_TRANSLATIONS[trimmedQuery]) {
      queries.push(...LANDMARK_TRANSLATIONS[trimmedQuery]);
    }
    // 2. 简体→繁体转换
    const traditional = toTraditionalChinese(trimmedQuery);
    if (traditional !== trimmedQuery) {
      queries.push(traditional);
    }
  }

  // 并行搜索前 3 个查询（Photon）
  const photonQueries = queries.slice(0, 3);
  const photonResults = await Promise.all(
    photonQueries.map((q) => searchPhoton(q, Math.max(3, Math.ceil(limit / 2))))
  );

  // 合并去重
  const seen = new Set<string>();
  const merged: SearchResult[] = [];

  for (const results of photonResults) {
    for (const result of results) {
      const key = `${result.lat},${result.lon}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(result);
      }
    }
  }

  // 如果 Photon 结果不足，尝试 Nominatim 兜底
  if (merged.length < 3) {
    const nominatimResults = await searchNominatim(trimmedQuery, limit);
    for (const result of nominatimResults) {
      const key = `${result.lat},${result.lon}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(result);
      }
    }
  }

  return NextResponse.json(merged.slice(0, limit));
}
