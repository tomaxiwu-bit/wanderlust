/**
 * AI 行程智能生成引擎
 *
 * 灵感来源：Wanderboat AI 的自然语言行程生成
 *
 * 实现：基于规则的自然语言解析 + 模板匹配 + 结构化生成
 * 1. 解析用户输入（目的地、天数、偏好）
 * 2. 匹配现有种子模板
 * 3. 无匹配时生成基础行程框架
 *
 * 无需外部 AI API，纯本地运算
 */

import { SEED_TEMPLATES } from "./seed-templates";
import type { PlaceType } from "@/types";

/** 解析结果 */
export interface ParsedIntent {
  /** 目的地 */
  destination: string;
  /** 天数 */
  days: number;
  /** 偏好关键词 */
  preferences: string[];
  /** 原始输入 */
  rawInput: string;
}

/** 生成的行程建议 */
export interface GeneratedItinerary {
  /** 标题 */
  title: string;
  /** 目的地 */
  destination: string;
  /** 天数 */
  days: number;
  /** 描述 */
  description: string;
  /** 每日主题 */
  dailyThemes: string[];
  /** 建议的地点类型（每天） */
  dailyPlaceTypes: PlaceType[][];
  /** 标签 */
  tags: string[];
  /** 匹配的模板 ID（如果有） */
  matchedTemplateId?: string;
  /** 匹配的模板标题 */
  matchedTemplateTitle?: string;
  /** 置信度 0-1 */
  confidence: number;
}

/** 目的地别名映射 */
const DESTINATION_ALIASES: Record<string, string> = {
  京: "北京",
  北京: "北京",
  沪: "上海",
  上海: "上海",
  蓉: "成都",
  成都: "成都",
  渝: "重庆",
  重庆: "重庆",
  羊城: "广州",
  广州: "广州",
  鹏城: "深圳",
  深圳: "深圳",
  春城: "昆明",
  昆明: "昆明",
  冰城: "哈尔滨",
  哈尔滨: "哈尔滨",
  江城: "武汉",
  武汉: "武汉",
  星城: "长沙",
  长沙: "长沙",
  金陵: "南京",
  南京: "南京",
  姑苏: "苏州",
  苏州: "苏州",
  临安: "杭州",
  杭州: "杭州",
  鹭岛: "厦门",
  厦门: "厦门",
  琴岛: "青岛",
  青岛: "青岛",
  榕城: "福州",
  福州: "福州",
  洪城: "南昌",
  南昌: "南昌",
  日光城: "拉萨",
  拉萨: "拉萨",
  西藏: "拉萨",
  椰城: "海口",
  海口: "海口",
  鹿城: "三亚",
  三亚: "三亚",
  桂林: "桂林",
  阳朔: "桂林",
  张家界: "张家界",
  九寨沟: "九寨沟",
  黄山: "黄山",
  凤凰: "凤凰古城",
  凤凰古城: "凤凰古城",
  呼伦贝尔: "呼伦贝尔",
  伊犁: "伊犁",
  新疆: "伊犁",
  西安: "西安",
  长安: "西安",
  丽江: "丽江",
  大理: "大理",
  云南: "丽江",
};

/** 偏好关键词映射 */
const PREFERENCE_KEYWORDS: Record<string, string[]> = {
  文化历史: ["历史", "文化", "古迹", "古", "博物馆", "遗址", "故宫", "城墙", "陵", "寺", "庙"],
  自然风光: ["自然", "风景", "山", "湖", "海", "江", "河", "瀑布", "峡谷", "草原", "森林", "风光"],
  美食: ["美食", "吃", "小吃", "餐厅", "美味", "吃货", "特色菜", "当地菜"],
  购物: ["购物", "买", "逛街", "商场", "免税", "特产"],
  亲子: ["亲子", "儿童", "孩子", "家庭", "小朋友", "乐园"],
  徒步: ["徒步", "登山", "爬山", "hiking", "户外", "探险"],
  海滩: ["海滩", "海边", "沙滩", "游泳", "潜水", "海岛"],
  温泉: ["温泉", "spa", "泡汤"],
  摄影: ["摄影", "拍照", "打卡", "网红", "出片"],
  夜生活: ["夜生活", "酒吧", "夜市", "夜景", "灯光"],
};

/** 提取天数 */
function extractDays(input: string): number {
  // 匹配 "3天" "三天" "5日" "五天" 等
  const chineseNums: Record<string, number> = {
    一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
  };

  // 阿拉伯数字
  const arabicMatch = input.match(/(\d+)\s*[天日]/);
  if (arabicMatch) return Math.min(Math.max(parseInt(arabicMatch[1]), 1), 30);

  // 中文数字
  const chineseMatch = input.match(/([一二三四五六七八九十两])\s*[天日]/);
  if (chineseMatch && chineseMatch[1]) {
    const num = chineseNums[chineseMatch[1]];
    if (num !== undefined) return num;
  }

  // 默认 3 天
  return 3;
}

/** 提取目的地 */
function extractDestination(input: string): string {
  // 检查所有别名
  for (const [alias, canonical] of Object.entries(DESTINATION_ALIASES)) {
    if (input.includes(alias)) {
      return canonical;
    }
  }
  return "";
}

/** 提取偏好 */
function extractPreferences(input: string): string[] {
  const prefs: string[] = [];
  for (const [pref, keywords] of Object.entries(PREFERENCE_KEYWORDS)) {
    if (keywords.some((kw) => input.includes(kw))) {
      prefs.push(pref);
    }
  }
  return prefs;
}

/**
 * 解析用户自然语言输入
 */
export function parseIntent(input: string): ParsedIntent {
  const destination = extractDestination(input);
  const days = extractDays(input);
  const preferences = extractPreferences(input);

  return {
    destination,
    days,
    preferences,
    rawInput: input,
  };
}

/**
 * 根据解析结果匹配种子模板
 */
function matchTemplate(intent: ParsedIntent): {
  templateId?: string;
  templateTitle?: string;
  confidence: number;
} {
  if (!intent.destination) return { confidence: 0 };

  // 在种子模板中查找匹配
  for (const template of SEED_TEMPLATES) {
    const templateDest = template.trip.destination;
    // 精确匹配
    if (templateDest === intent.destination) {
      return {
        templateId: template.trip.id,
        templateTitle: template.trip.title,
        confidence: 0.95,
      };
    }
    // 模糊匹配（目的地包含关系）
    if (
      templateDest.includes(intent.destination) ||
      intent.destination.includes(templateDest)
    ) {
      return {
        templateId: template.trip.id,
        templateTitle: template.trip.title,
        confidence: 0.8,
      };
    }
  }

  return { confidence: 0 };
}

/** 根据偏好的地点类型模板 */
const PREF_PLACE_TYPES: Record<string, PlaceType[]> = {
  文化历史: ["attraction", "attraction", "attraction", "restaurant"],
  自然风光: ["attraction", "attraction", "restaurant", "attraction"],
  美食: ["restaurant", "attraction", "restaurant", "restaurant"],
  购物: ["shopping", "attraction", "shopping", "restaurant"],
  亲子: ["attraction", "restaurant", "attraction", "hotel"],
  徒步: ["attraction", "attraction", "attraction", "restaurant"],
  海滩: ["attraction", "restaurant", "attraction", "hotel"],
  温泉: ["hotel", "attraction", "restaurant", "hotel"],
  摄影: ["attraction", "attraction", "restaurant", "attraction"],
  夜生活: ["attraction", "restaurant", "shopping", "attraction"],
};

/** 默认每日地点类型 */
const DEFAULT_DAILY_TYPES: PlaceType[] = ["attraction", "restaurant", "attraction", "restaurant"];

/** 每日主题模板 */
const DAILY_THEMES = [
  "抵达安顿 · 市区初探",
  "核心景点 · 深度游览",
  "文化体验 · 美食探索",
  "自然风光 · 摄影打卡",
  "小众路线 · 在地体验",
  "购物休闲 · 返程准备",
  "周边游 · 延伸探索",
  "深度体验 · 主题日",
  "休闲放松 · 城市漫步",
  "最后冲刺 · 购买特产",
];

/**
 * 生成行程建议
 */
export function generateItinerary(input: string): GeneratedItinerary {
  const intent = parseIntent(input);
  const match = matchTemplate(intent);

  // 根据偏好选择地点类型模板
  const placeTypes = intent.preferences.length > 0
    ? PREF_PLACE_TYPES[intent.preferences[0]] ?? DEFAULT_DAILY_TYPES
    : DEFAULT_DAILY_TYPES;

  // 生成每日安排
  const dailyPlaceTypes: PlaceType[][] = [];
  const dailyThemes: string[] = [];
  for (let day = 0; day < intent.days; day++) {
    dailyPlaceTypes.push(placeTypes);
    dailyThemes.push(DAILY_THEMES[day % DAILY_THEMES.length]);
  }

  // 生成标题和描述
  const title = intent.destination
    ? `${intent.destination}${intent.days}日游`
    : `${intent.days}日行程`;

  const prefDesc = intent.preferences.length > 0
    ? `偏好：${intent.preferences.join("、")}`
    : "综合体验";

  const description = match.templateTitle
    ? `参考攻略：${match.templateTitle}。${prefDesc}`
    : `根据你的需求自动生成的${intent.days}天行程框架。${prefDesc}`;

  return {
    title,
    destination: intent.destination || "待定",
    days: intent.days,
    description,
    dailyThemes,
    dailyPlaceTypes,
    tags: intent.preferences,
    matchedTemplateId: match.templateId,
    matchedTemplateTitle: match.templateTitle,
    confidence: match.confidence,
  };
}

/** 建议的地点名称模板（根据类型） */
export const PLACE_NAME_SUGGESTIONS: Record<PlaceType, string[]> = {
  attraction: ["当地核心景点", "特色景点", "网红打卡地", "历史古迹", "自然景观"],
  restaurant: ["当地特色餐厅", "网红美食店", "传统小吃街", "高分餐厅", "地方菜馆"],
  hotel: ["市中心酒店", "景区附近住宿", "特色民宿", "商务酒店", "度假村"],
  transport: ["机场/车站", "租车点", "码头", "公交枢纽", "地铁站"],
  shopping: ["特产商店", "步行街", "购物中心", "夜市", "免税店"],
  other: ["观景台", "体验馆", "文化中心", "公园", "广场"],
};

/**
 * 为指定天数和类型生成建议的地点名称
 */
export function suggestPlaceName(type: PlaceType, dayIndex: number): string {
  const names = PLACE_NAME_SUGGESTIONS[type] ?? PLACE_NAME_SUGGESTIONS.other;
  return names[dayIndex % names.length];
}
