/**
 * 智能打包建议引擎
 *
 * 灵感来源：PackPoint 的上下文感知打包清单
 * - 根据行程天数推荐衣物数量
 * - 根据目的地推断气候（关键词匹配）
 * - 根据地点类型推断活动（海边/登山/城市观光）
 * - 通用必备品清单
 */

import type { Place, PackingCategory } from "@/types";

/** 建议物品 */
export interface PackingSuggestion {
  name: string;
  category: PackingCategory;
  quantity: number;
  reason: string;
}

/** 目的地气候关键词映射 */
const CLIMATE_KEYWORDS: Record<
  string,
  { suggestions: Omit<PackingSuggestion, "reason">[]; reason: string }
> = {
  // 海滨/热带
  海: {
    suggestions: [
      { name: "防晒霜", category: "toiletries", quantity: 1 },
      { name: "太阳镜", category: "essentials", quantity: 1 },
      { name: "泳衣", category: "clothing", quantity: 1 },
      { name: "沙滩凉鞋", category: "clothing", quantity: 1 },
    ],
    reason: "目的地含海滨/沙滩关键词",
  },
  三亚: {
    suggestions: [
      { name: "防晒霜", category: "toiletries", quantity: 1 },
      { name: "太阳镜", category: "essentials", quantity: 1 },
      { name: "泳衣", category: "clothing", quantity: 1 },
    ],
    reason: "热带海滨城市",
  },
  // 寒冷地区
  哈尔滨: {
    suggestions: [
      { name: "羽绒服", category: "clothing", quantity: 1 },
      { name: "保暖内衣", category: "clothing", quantity: 2 },
      { name: "手套", category: "clothing", quantity: 1 },
      { name: "围巾", category: "clothing", quantity: 1 },
      { name: "暖宝宝", category: "miscellaneous", quantity: 10 },
    ],
    reason: "寒冷地区",
  },
  西藏: {
    suggestions: [
      { name: "羽绒服", category: "clothing", quantity: 1 },
      { name: "保暖内衣", category: "clothing", quantity: 2 },
      { name: "红景天", category: "miscellaneous", quantity: 1 },
      { name: "润唇膏", category: "toiletries", quantity: 1 },
    ],
    reason: "高海拔地区",
  },
  // 国际旅行
  日本: {
    suggestions: [
      { name: "护照", category: "documents", quantity: 1 },
      { name: "签证", category: "documents", quantity: 1 },
      { name: "旅行转换插头", category: "electronics", quantity: 1 },
    ],
    reason: "国际旅行",
  },
  韩国: {
    suggestions: [
      { name: "护照", category: "documents", quantity: 1 },
      { name: "签证", category: "documents", quantity: 1 },
      { name: "旅行转换插头", category: "electronics", quantity: 1 },
    ],
    reason: "国际旅行",
  },
  泰国: {
    suggestions: [
      { name: "护照", category: "documents", quantity: 1 },
      { name: "签证", category: "documents", quantity: 1 },
      { name: "防晒霜", category: "toiletries", quantity: 1 },
      { name: "驱蚊液", category: "toiletries", quantity: 1 },
    ],
    reason: "东南亚热带国家",
  },
};

/** 通用必备品 */
const UNIVERSAL_ESSENTIALS: Omit<PackingSuggestion, "reason">[] = [
  { name: "身份证", category: "documents", quantity: 1 },
  { name: "手机充电器", category: "electronics", quantity: 1 },
  { name: "充电宝", category: "electronics", quantity: 1 },
  { name: "牙刷", category: "toiletries", quantity: 1 },
  { name: "牙膏", category: "toiletries", quantity: 1 },
  { name: "毛巾", category: "toiletries", quantity: 1 },
  { name: "雨伞", category: "essentials", quantity: 1 },
  { name: "钱包", category: "essentials", quantity: 1 },
  { name: "常用药品", category: "miscellaneous", quantity: 1 },
];

/** 基于天数的衣物推荐 */
function clothingForDays(days: number): Omit<PackingSuggestion, "reason">[] {
  const underwearCount = Math.min(days + 1, 7);
  const sockCount = Math.min(days + 1, 7);
  const topCount = Math.min(Math.ceil(days / 2) + 1, 5);
  const pantsCount = Math.min(Math.ceil(days / 3) + 1, 3);

  return [
    { name: "内裤", category: "clothing", quantity: underwearCount },
    { name: "袜子", category: "clothing", quantity: sockCount },
    { name: "上衣", category: "clothing", quantity: topCount },
    { name: "裤子", category: "clothing", quantity: pantsCount },
    { name: "外套", category: "clothing", quantity: 1 },
    { name: "睡衣", category: "clothing", quantity: 1 },
  ];
}

/** 根据地点类型推断活动装备 */
function gearForPlaces(places: Place[]): Omit<PackingSuggestion, "reason">[] {
  const gear: Omit<PackingSuggestion, "reason">[] = [];
  const types = new Set(places.map((p) => p.type));

  // 有住宿 → 少带洗漱（酒店提供）
  if (types.has("hotel")) {
    // 不额外添加，保持通用洗漱
  }

  // 有购物 → 大袋子
  if (types.has("shopping")) {
    gear.push({ name: "折叠购物袋", category: "miscellaneous", quantity: 1 });
  }

  // 分析地点名称中的活动关键词
  const allNames = places.map((p) => p.name).join(" ");
  if (/山|徒步|hiking|登山|trail/i.test(allNames)) {
    gear.push({ name: "登山鞋", category: "clothing", quantity: 1 });
    gear.push({ name: "登山杖", category: "miscellaneous", quantity: 1 });
  }
  if (/温泉|hot spring|spa/i.test(allNames)) {
    gear.push({ name: "泳衣", category: "clothing", quantity: 1 });
  }
  if (/滑雪|ski|snow/i.test(allNames)) {
    gear.push({ name: "滑雪手套", category: "clothing", quantity: 1 });
    gear.push({ name: "滑雪镜", category: "essentials", quantity: 1 });
  }

  return gear;
}

/**
 * 生成智能打包建议
 * @param destination 目的地
 * @param days 行程天数
 * @param places 地点列表
 */
export function generatePackingSuggestions(
  destination: string,
  days: number,
  places: Place[]
): PackingSuggestion[] {
  const suggestions: PackingSuggestion[] = [];

  // 1. 通用必备品
  for (const item of UNIVERSAL_ESSENTIALS) {
    suggestions.push({ ...item, reason: "通用必备" });
  }

  // 2. 基于天数的衣物
  for (const item of clothingForDays(days)) {
    suggestions.push({ ...item, reason: `根据 ${days} 天行程` });
  }

  // 3. 目的地气候匹配
  for (const [keyword, config] of Object.entries(CLIMATE_KEYWORDS)) {
    if (destination.includes(keyword)) {
      for (const item of config.suggestions) {
        suggestions.push({ ...item, reason: config.reason });
      }
      break;
    }
  }

  // 4. 活动装备
  const gear = gearForPlaces(places);
  for (const item of gear) {
    suggestions.push({ ...item, reason: "根据行程活动" });
  }

  // 去重：同名物品取最大数量
  const seen = new Map<string, PackingSuggestion>();
  for (const s of suggestions) {
    const existing = seen.get(s.name);
    if (existing) {
      if (s.quantity > existing.quantity) {
        existing.quantity = s.quantity;
      }
      // 合并原因
      if (!existing.reason.includes(s.reason)) {
        existing.reason = `${existing.reason}、${s.reason}`;
      }
    } else {
      seen.set(s.name, { ...s });
    }
  }

  return Array.from(seen.values());
}
