/**
 * 种子行程模板
 *
 * 数据来源：B站（哔哩哔哩）旅游攻略视频
 * 行程内容基于公开景点常识设计，视频作为参考链接展示
 *
 * 每个模板包含：
 * - trip: Trip 基本信息（userId = "seed" 标识种子数据）
 * - places: Place[] 每日行程地点（含坐标）
 * - sourceVideo: B站源视频信息
 */

import type { Trip, Place, PlaceType } from "@/types";

export interface SeedTemplate {
  trip: Trip;
  places: Place[];
  sourceVideo: {
    title: string;
    author: string;
    bvid: string;
    url: string;
    playCount: number;
    duration: string;
  };
  /** 模板标签（用于筛选，如：海岛、古城、美食、亲子、徒步、文化、自然） */
  tags: string[];
  /** 人均预算估算（CNY） */
  estimatedBudget: number;
  /** 最佳游玩季节 */
  bestSeason: string;
  /** 行程难度 */
  difficulty: "轻松" | "适中" | "挑战";
  /** 行程亮点（3-5条） */
  highlights: string[];
  /** 每日主题（按天，如："Day 1 - 市区经典"） */
  dailyThemes: string[];
  /** 封面渐变色（CSS gradient） */
  coverGradient: string;
}

const NOW = "2024-09-01T00:00:00.000Z";

// ============ 辅助构造函数 ============

function makeTrip(
  id: string,
  title: string,
  description: string,
  destination: string,
  startDate: string,
  endDate: string,
  coverImage: string = "",
): Trip {
  return {
    id,
    userId: "seed",
    title,
    description,
    destination,
    startDate,
    endDate,
    coverImage: coverImage || undefined,
    status: "planning",
    visibility: "public",
    baseCurrency: "CNY",
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function makePlace(
  tripId: string,
  dayIndex: number,
  order: number,
  name: string,
  type: PlaceType,
  lat: number,
  lng: number,
  opts: { address?: string; stayMinutes?: number; notes?: string; rating?: number } = {},
): Place {
  return {
    id: `${tripId}-d${dayIndex}-p${order}`,
    tripId,
    dayIndex,
    order,
    name,
    type,
    lat,
    lng,
    address: opts.address,
    stayMinutes: opts.stayMinutes,
    notes: opts.notes,
    rating: opts.rating,
  };
}

// ============ 种子模板数据 ============

export const SEED_TEMPLATES: SeedTemplate[] = [
  // ===== 1. 成都 3日游 =====
  {
    trip: makeTrip(
      "seed-chengdu-3d",
      "成都3日经典游",
      "涵盖大熊猫基地、宽窄巷子、武侯祠锦里等核心景点，体验休闲之都的慢生活与火锅文化。",
      "成都",
      "2024-10-01",
      "2024-10-03",
    ),
    places: [
      makePlace("seed-chengdu-3d", 0, 0, "春熙路", "shopping", 30.6535, 104.0817, { stayMinutes: 120, notes: "成都最繁华商圈，IFS熊猫雕塑打卡" }),
      makePlace("seed-chengdu-3d", 0, 1, "成都远洋太古里", "shopping", 30.6542, 104.085, { stayMinutes: 90, rating: 4 }),
      makePlace("seed-chengdu-3d", 0, 2, "宽窄巷子", "attraction", 30.6695, 104.0551, { stayMinutes: 150, notes: "清代古街区，体验老成都生活" }),
      makePlace("seed-chengdu-3d", 1, 0, "成都大熊猫繁育研究基地", "attraction", 30.7327, 104.1367, { stayMinutes: 240, notes: "建议早上8点前到达，看熊猫吃竹子" }),
      makePlace("seed-chengdu-3d", 1, 1, "武侯祠", "attraction", 30.6419, 104.0487, { stayMinutes: 90, rating: 4 }),
      makePlace("seed-chengdu-3d", 1, 2, "锦里古街", "attraction", 30.6407, 104.048, { stayMinutes: 120, notes: "武侯祠旁边，品尝成都小吃" }),
      makePlace("seed-chengdu-3d", 2, 0, "杜甫草堂", "attraction", 30.6577, 104.024, { stayMinutes: 120, rating: 4 }),
      makePlace("seed-chengdu-3d", 2, 1, "青羊宫", "attraction", 30.669, 104.014, { stayMinutes: 60 }),
      makePlace("seed-chengdu-3d", 2, 2, "九眼桥", "other", 30.646, 104.082, { stayMinutes: 120, notes: "夜生活酒吧一条街" }),
    ],
    sourceVideo: {
      title: "送你一份超详细的成都三日旅游攻略 | 内含图文版",
      author: "迈得丘MadQ",
      bvid: "BV1hm421J7tc",
      url: "https://www.bilibili.com/video/BV1hm421J7tc",
      playCount: 885000,
      duration: "10:52",
    },
    tags: ["美食", "古城", "文化", "休闲"],
    estimatedBudget: 1500,
    bestSeason: "3-6月 / 9-11月",
    difficulty: "轻松",
    highlights: [
      "大熊猫基地近距离观赏国宝",
      "宽窄巷子体验老成都慢生活",
      "锦里古街品尝地道小吃",
      "九眼桥夜生活酒吧街",
    ],
    dailyThemes: ["Day 1 - 市区商圈漫步", "Day 2 - 国宝与三国文化", "Day 3 - 诗歌与夜生活"],
    coverGradient: "linear-gradient(135deg, #ff6b6b 0%, #ee5a24 50%, #f0932b 100%)",
  },

  // ===== 2. 西安 3日游 =====
  {
    trip: makeTrip(
      "seed-xian-3d",
      "西安3日古都游",
      "穿越千年古都，打卡兵马俑、城墙、大雁塔，品味回民街美食与大唐不夜城夜景。",
      "西安",
      "2024-10-01",
      "2024-10-03",
    ),
    places: [
      makePlace("seed-xian-3d", 0, 0, "钟楼", "attraction", 34.2614, 108.9398, { stayMinutes: 60 }),
      makePlace("seed-xian-3d", 0, 1, "鼓楼", "attraction", 34.2625, 108.9376, { stayMinutes: 30 }),
      makePlace("seed-xian-3d", 0, 2, "回民街", "restaurant", 34.2636, 108.937, { stayMinutes: 120, notes: "羊肉泡馍、肉夹馍、biangbiang面" }),
      makePlace("seed-xian-3d", 0, 3, "西安城墙", "attraction", 34.2586, 108.9403, { stayMinutes: 120, notes: "可租自行车骑行，傍晚最佳" }),
      makePlace("seed-xian-3d", 1, 0, "秦始皇兵马俑博物馆", "attraction", 34.3848, 109.273, { stayMinutes: 300, notes: "世界第八大奇迹，建议请讲解" }),
      makePlace("seed-xian-3d", 1, 1, "华清宫", "attraction", 34.3656, 109.2138, { stayMinutes: 120, rating: 4 }),
      makePlace("seed-xian-3d", 2, 0, "陕西历史博物馆", "attraction", 34.2284, 108.9593, { stayMinutes: 180, notes: "需提前预约，珍宝馆值得看" }),
      makePlace("seed-xian-3d", 2, 1, "大雁塔", "attraction", 34.2185, 108.959, { stayMinutes: 90, rating: 4 }),
      makePlace("seed-xian-3d", 2, 2, "大唐不夜城", "attraction", 34.2147, 108.9613, { stayMinutes: 150, notes: "夜景灯光秀，不倒翁小姐姐" }),
    ],
    sourceVideo: {
      title: "送你一份超详细的西安三日旅游攻略 | 内含图文版",
      author: "迈得丘MadQ",
      bvid: "BV1Aw411M743",
      url: "https://www.bilibili.com/video/BV1Aw411M743",
      playCount: 1479938,
      duration: "9:20",
    },
    tags: ["古都", "文化", "美食", "历史"],
    estimatedBudget: 1800,
    bestSeason: "3-5月 / 9-11月",
    difficulty: "轻松",
    highlights: [
      "世界第八大奇迹兵马俑",
      "骑行明城墙俯瞰古都",
      "大唐不夜城璀璨夜景",
      "回民街一站式品尝西北美食",
    ],
    dailyThemes: ["Day 1 - 钟鼓楼与城墙骑行", "Day 2 - 秦始皇陵兵马俑", "Day 3 - 盛唐文化与夜游"],
    coverGradient: "linear-gradient(135deg, #83471c 0%, #c0392b 50%, #d35400 100%)",
  },

  // ===== 3. 厦门 4日游 =====
  {
    trip: makeTrip(
      "seed-xiamen-4d",
      "厦门4日海岛游",
      "漫步鼓浪屿万国建筑，骑行环岛路，逛曾厝垵文艺村，感受闽南滨海城市的浪漫与美食。",
      "厦门",
      "2024-10-01",
      "2024-10-04",
    ),
    places: [
      makePlace("seed-xiamen-4d", 0, 0, "鼓浪屿", "attraction", 24.447, 118.066, { stayMinutes: 360, notes: "需提前买船票，日光岩、菽庄花园必去" }),
      makePlace("seed-xiamen-4d", 0, 1, "中山路步行街", "shopping", 24.46, 118.084, { stayMinutes: 120, notes: "骑楼建筑，沙茶面、花生汤" }),
      makePlace("seed-xiamen-4d", 1, 0, "南普陀寺", "attraction", 24.44, 118.087, { stayMinutes: 90, rating: 4 }),
      makePlace("seed-xiamen-4d", 1, 1, "厦门大学", "attraction", 24.437, 118.088, { stayMinutes: 120, notes: "中国最美大学，需预约" }),
      makePlace("seed-xiamen-4d", 1, 2, "环岛路", "attraction", 24.435, 118.11, { stayMinutes: 120, notes: "骑行海滨栈道，白城沙滩" }),
      makePlace("seed-xiamen-4d", 2, 0, "曾厝垵", "attraction", 24.436, 118.108, { stayMinutes: 150, notes: "文艺渔村，小吃和文创店" }),
      makePlace("seed-xiamen-4d", 2, 1, "胡里山炮台", "attraction", 24.434, 118.106, { stayMinutes: 60 }),
      makePlace("seed-xiamen-4d", 3, 0, "集美学村", "attraction", 24.575, 118.107, { stayMinutes: 120, rating: 4 }),
      makePlace("seed-xiamen-4d", 3, 1, "厦门园林博览苑", "attraction", 24.553, 118.146, { stayMinutes: 180 }),
    ],
    sourceVideo: {
      title: "【VLOG】厦门游记|四天三夜|超详细旅游攻略|干货",
      author: "JWC加油站",
      bvid: "BV1RW411z7AT",
      url: "https://www.bilibili.com/video/BV1RW411z7AT",
      playCount: 834860,
      duration: "14:35",
    },
    tags: ["海岛", "文艺", "美食", "休闲"],
    estimatedBudget: 2000,
    bestSeason: "3-5月 / 10-12月",
    difficulty: "轻松",
    highlights: [
      "鼓浪屿万国建筑漫游",
      "环岛路海滨骑行",
      "曾厝垵文艺渔村逛吃",
      "中国最美大学厦门大学",
    ],
    dailyThemes: ["Day 1 - 鼓浪屿探岛", "Day 2 - 南普陀与环岛路", "Day 3 - 文艺渔村与炮台", "Day 4 - 集美学村"],
    coverGradient: "linear-gradient(135deg, #48dbfb 0%, #0a3d62 50%, #3c6382 100%)",
  },

  // ===== 4. 云南大理丽江 5日游 =====
  {
    trip: makeTrip(
      "seed-yunnan-5d",
      "云南5日昆大丽游",
      "从昆明出发，环洱海游大理古城，丽江古城漫步，登玉龙雪山，一次玩转云南北线精华。",
      "云南（昆明-大理-丽江）",
      "2024-10-01",
      "2024-10-05",
    ),
    places: [
      makePlace("seed-yunnan-5d", 0, 0, "翠湖公园", "attraction", 25.049, 102.705, { stayMinutes: 90, notes: "昆明市区休整，红嘴鸥（冬季）" }),
      makePlace("seed-yunnan-5d", 0, 1, "昆明金马碧鸡坊", "attraction", 25.039, 102.704, { stayMinutes: 60 }),
      makePlace("seed-yunnan-5d", 1, 0, "大理古城", "attraction", 25.694, 100.158, { stayMinutes: 180, notes: "五华楼、洋人街、三塔倒影" }),
      makePlace("seed-yunnan-5d", 1, 1, "洱海", "attraction", 25.78, 100.18, { stayMinutes: 240, notes: "环海骑行或自驾，双廊看日落" }),
      makePlace("seed-yunnan-5d", 2, 0, "崇圣寺三塔", "attraction", 25.726, 100.153, { stayMinutes: 120, rating: 4 }),
      makePlace("seed-yunnan-5d", 2, 1, "双廊古镇", "attraction", 25.946, 100.183, { stayMinutes: 150, notes: "洱海东岸，杨丽萍艺术酒店" }),
      makePlace("seed-yunnan-5d", 3, 0, "丽江古城", "attraction", 26.872, 100.227, { stayMinutes: 240, notes: "四方街、木府、大水车" }),
      makePlace("seed-yunnan-5d", 3, 1, "木府", "attraction", 26.871, 100.226, { stayMinutes: 90, notes: "纳西族土司衙门" }),
      makePlace("seed-yunnan-5d", 4, 0, "玉龙雪山", "attraction", 27.1, 100.17, { stayMinutes: 360, notes: "需提前抢票，索道至4506米" }),
      makePlace("seed-yunnan-5d", 4, 1, "蓝月谷", "attraction", 27.083, 100.182, { stayMinutes: 90, notes: "雪山脚下，湖水蓝绿色" }),
    ],
    sourceVideo: {
      title: "云南5日游 | 丽江大理昆明，超详细旅游攻略，有这一篇就够了",
      author: "码语者和杰妮",
      bvid: "BV1xS421o7bm",
      url: "https://www.bilibili.com/video/BV1xS421o7bm",
      playCount: 563441,
      duration: "11:28",
    },
    tags: ["自然", "古城", "雪山", "民族风情"],
    estimatedBudget: 3500,
    bestSeason: "3-4月 / 9-11月",
    difficulty: "适中",
    highlights: [
      "环洱海骑行大理古城",
      "丽江古城纳西文化体验",
      "玉龙雪山登顶4506米",
      "蓝月谷蓝宝石色湖水",
    ],
    dailyThemes: ["Day 1 - 昆明休整", "Day 2 - 大理古城与洱海", "Day 3 - 三塔与双廊", "Day 4 - 丽江古城", "Day 5 - 玉龙雪山"],
    coverGradient: "linear-gradient(135deg, #a8e6cf 0%, #56ab2f 50%, #2d6a4f 100%)",
  },

  // ===== 5. 重庆 5日游 =====
  {
    trip: makeTrip(
      "seed-chongqing-5d",
      "重庆5日山城游",
      "8D魔幻城市深度游，洪崖洞夜景、李子坝穿楼轻轨、武隆天生三桥，火锅与小面一路相伴。",
      "重庆",
      "2024-10-01",
      "2024-10-05",
    ),
    places: [
      makePlace("seed-chongqing-5d", 0, 0, "解放碑步行街", "shopping", 29.555, 106.578, { stayMinutes: 90, notes: "重庆地标商圈" }),
      makePlace("seed-chongqing-5d", 0, 1, "洪崖洞", "attraction", 29.567, 106.581, { stayMinutes: 120, notes: "千与千寻同款夜景，晚上亮灯最佳" }),
      makePlace("seed-chongqing-5d", 1, 0, "磁器口古镇", "attraction", 29.58, 106.447, { stayMinutes: 150, notes: "陈麻花、毛血旺" }),
      makePlace("seed-chongqing-5d", 1, 1, "白公馆", "attraction", 29.575, 106.426, { stayMinutes: 60, notes: "渣滓洞白公馆红色旅游" }),
      makePlace("seed-chongqing-5d", 2, 0, "武隆天生三桥", "attraction", 29.32, 107.76, { stayMinutes: 300, notes: "世界自然遗产，满城尽带黄金甲取景地" }),
      makePlace("seed-chongqing-5d", 3, 0, "长江索道", "transport", 29.553, 106.586, { stayMinutes: 30, notes: "跨江缆车，需排队" }),
      makePlace("seed-chongqing-5d", 3, 1, "南山一棵树观景台", "attraction", 29.52, 106.615, { stayMinutes: 90, notes: "俯瞰重庆夜景最佳点" }),
      makePlace("seed-chongqing-5d", 4, 0, "李子坝轻轨站", "transport", 29.556, 106.54, { stayMinutes: 30, notes: "轻轨穿楼奇观" }),
      makePlace("seed-chongqing-5d", 4, 1, "鹅岭公园", "attraction", 29.549, 106.543, { stayMinutes: 60 }),
      makePlace("seed-chongqing-5d", 4, 2, "观音桥步行街", "shopping", 29.571, 106.551, { stayMinutes: 120, notes: "本地人爱逛的商圈" }),
    ],
    sourceVideo: {
      title: "第一次去重庆该怎么玩？请收下这份5天4晚的保姆级攻略",
      author: "大橘小狸环游记",
      bvid: "BV1bv4y177NJ",
      url: "https://www.bilibili.com/video/BV1bv4y177NJ",
      playCount: 1033099,
      duration: "13:55",
    },
    tags: ["美食", "山城", "夜景", "网红"],
    estimatedBudget: 2500,
    bestSeason: "3-5月 / 10-11月",
    difficulty: "轻松",
    highlights: [
      "洪崖洞千与千寻同款夜景",
      "李子坝轻轨穿楼奇观",
      "武隆天生三桥世界遗产",
      "长江索道跨江体验",
    ],
    dailyThemes: ["Day 1 - 解放碑与洪崖洞", "Day 2 - 磁器口与白公馆", "Day 3 - 武隆天生三桥", "Day 4 - 索道与南山夜景", "Day 5 - 穿楼轻轨与商圈"],
    coverGradient: "linear-gradient(135deg, #6c5ce7 0%, #341f97 50%, #5f27cd 100%)",
  },

  // ===== 6. 杭州 3日游 =====
  {
    trip: makeTrip(
      "seed-hangzhou-3d",
      "杭州3日西湖游",
      "泛舟西湖十景，参禅灵隐寺，漫步龙井茶园，品味宋城千古情，感受江南诗画之城。",
      "杭州",
      "2024-10-01",
      "2024-10-03",
    ),
    places: [
      makePlace("seed-hangzhou-3d", 0, 0, "断桥残雪", "attraction", 30.26, 120.15, { stayMinutes: 30, notes: "白蛇传传说地" }),
      makePlace("seed-hangzhou-3d", 0, 1, "白堤", "attraction", 30.255, 120.145, { stayMinutes: 60, notes: "漫步西湖边" }),
      makePlace("seed-hangzhou-3d", 0, 2, "苏堤春晓", "attraction", 30.24, 120.13, { stayMinutes: 90, rating: 4 }),
      makePlace("seed-hangzhou-3d", 0, 3, "花港观鱼", "attraction", 30.23, 120.14, { stayMinutes: 60 }),
      makePlace("seed-hangzhou-3d", 1, 0, "灵隐寺", "attraction", 30.24, 120.1, { stayMinutes: 150, notes: "千年古刹，飞来峰石窟" }),
      makePlace("seed-hangzhou-3d", 1, 1, "飞来峰", "attraction", 30.241, 120.099, { stayMinutes: 60 }),
      makePlace("seed-hangzhou-3d", 1, 2, "龙井村", "attraction", 30.22, 120.11, { stayMinutes: 120, notes: "品龙井茶，看茶园梯田" }),
      makePlace("seed-hangzhou-3d", 2, 0, "河坊街", "shopping", 30.25, 120.17, { stayMinutes: 120, notes: "南宋老街，定胜糕、龙须糖" }),
      makePlace("seed-hangzhou-3d", 2, 1, "宋城", "attraction", 30.19, 120.11, { stayMinutes: 240, notes: "千古情演出值得看" }),
    ],
    sourceVideo: {
      title: "20分钟讲透杭州旅行：西湖+灵隐寺+小众路线，全网最全攻略",
      author: "阿眯sn",
      bvid: "BV1wcAEzjELP",
      url: "https://www.bilibili.com/video/BV1wcAEzjELP",
      playCount: 152916,
      duration: "22:12",
    },
    tags: ["江南", "湖泊", "文化", "茶园"],
    estimatedBudget: 1800,
    bestSeason: "3-5月 / 9-11月",
    difficulty: "轻松",
    highlights: [
      "西湖十景泛舟漫步",
      "灵隐寺千年古刹参禅",
      "龙井村茶园品茗",
      "宋城千古情大型演出",
    ],
    dailyThemes: ["Day 1 - 西湖十景漫步", "Day 2 - 灵隐寺与龙井茶", "Day 3 - 河坊街与宋城"],
    coverGradient: "linear-gradient(135deg, #74b9ff 0%, #0984e3 50%, #2d3436 100%)",
  },

  // ===== 7. 张家界 3日游 =====
  {
    trip: makeTrip(
      "seed-zhangjiajie-3d",
      "张家界3日奇峰游",
      "阿凡达取景地张家界国家森林公园，天子山云海，天门山玻璃栈道，感受大自然的鬼斧神工。",
      "张家界",
      "2024-10-01",
      "2024-10-03",
    ),
    places: [
      makePlace("seed-zhangjiajie-3d", 0, 0, "金鞭溪", "attraction", 29.34, 110.47, { stayMinutes: 120, notes: "峡谷溪流步道" }),
      makePlace("seed-zhangjiajie-3d", 0, 1, "袁家界", "attraction", 29.35, 110.47, { stayMinutes: 180, notes: "阿凡达哈利路亚山原型" }),
      makePlace("seed-zhangjiajie-3d", 1, 0, "天子山", "attraction", 29.33, 110.46, { stayMinutes: 180, notes: "云海日出最佳观景点" }),
      makePlace("seed-zhangjiajie-3d", 1, 1, "十里画廊", "attraction", 29.35, 110.48, { stayMinutes: 90, notes: "小火车观光峡谷" }),
      makePlace("seed-zhangjiajie-3d", 2, 0, "天门山", "attraction", 29.05, 110.48, { stayMinutes: 300, notes: "天门洞、999级天梯" }),
      makePlace("seed-zhangjiajie-3d", 2, 1, "玻璃栈道", "attraction", 29.05, 110.485, { stayMinutes: 60, notes: "悬崖玻璃栈道，需鞋套" }),
    ],
    sourceVideo: {
      title: "能看得懂，也能用得上的正经攻略。张家界国家森林公园【百大景区怎么玩】",
      author: "开元心旅行",
      bvid: "BV1gY9hB6EDD",
      url: "https://www.bilibili.com/video/BV1gY9hB6EDD",
      playCount: 1271132,
      duration: "35:04",
    },
    tags: ["自然", "奇峰", "徒步", "世界遗产"],
    estimatedBudget: 2200,
    bestSeason: "4-6月 / 9-10月",
    difficulty: "挑战",
    highlights: [
      "阿凡达哈利路亚山原型",
      "天子山云海日出",
      "天门山999级天梯",
      "玻璃栈道悬崖体验",
    ],
    dailyThemes: ["Day 1 - 金鞭溪与袁家界", "Day 2 - 天子山与十里画廊", "Day 3 - 天门山玻璃栈道"],
    coverGradient: "linear-gradient(135deg, #2d3436 0%, #636e72 50%, #b2bec3 100%)",
  },

  // ===== 8. 西藏拉萨 5日游 =====
  {
    trip: makeTrip(
      "seed-tibet-5d",
      "西藏拉萨5日游",
      "布达拉宫朝圣，大昭寺转经，纳木错圣湖日出，羊卓雍措蓝宝石，感受雪域高原的信仰与壮美。",
      "西藏拉萨",
      "2024-10-01",
      "2024-10-05",
    ),
    places: [
      makePlace("seed-tibet-5d", 0, 0, "布达拉宫", "attraction", 29.6577, 91.117, { stayMinutes: 180, notes: "需提前预约，注意高反" }),
      makePlace("seed-tibet-5d", 0, 1, "药王山观景台", "attraction", 29.65, 91.11, { stayMinutes: 60, notes: "50元人民币背面取景地" }),
      makePlace("seed-tibet-5d", 1, 0, "大昭寺", "attraction", 29.652, 91.131, { stayMinutes: 120, notes: "藏传佛教圣地，释迦牟尼12岁等身像" }),
      makePlace("seed-tibet-5d", 1, 1, "八廓街", "shopping", 29.651, 91.13, { stayMinutes: 120, notes: "转经道，唐卡、藏饰" }),
      makePlace("seed-tibet-5d", 2, 0, "纳木错", "attraction", 30.7, 90.5, { stayMinutes: 360, notes: "圣湖，海拔4718米，一日游往返" }),
      makePlace("seed-tibet-5d", 3, 0, "羊卓雍措", "attraction", 29.15, 90.45, { stayMinutes: 180, notes: "三大圣湖之一，蓝宝石色湖水" }),
      makePlace("seed-tibet-5d", 4, 0, "色拉寺", "attraction", 29.7, 91.15, { stayMinutes: 150, notes: "下午辩经活动值得观看" }),
      makePlace("seed-tibet-5d", 4, 1, "哲蚌寺", "attraction", 29.67, 91.09, { stayMinutes: 120, rating: 4 }),
    ],
    sourceVideo: {
      title: "西藏拉萨5天旅游攻略，适合假期短第一次去西藏的朋友",
      author: "芒果在路上Justwish8",
      bvid: "BV1VT411D7W3",
      url: "https://www.bilibili.com/video/BV1VT411D7W3",
      playCount: 88382,
      duration: "2:41",
    },
    tags: ["高原", "朝圣", "自然", "湖泊"],
    estimatedBudget: 4500,
    bestSeason: "6-9月",
    difficulty: "挑战",
    highlights: [
      "布达拉宫朝圣之旅",
      "纳木错圣湖海拔4718米",
      "羊卓雍措蓝宝石色湖水",
      "色拉寺辩经文化体验",
    ],
    dailyThemes: ["Day 1 - 布达拉宫", "Day 2 - 大昭寺与八廓街", "Day 3 - 纳木错圣湖", "Day 4 - 羊卓雍措", "Day 5 - 色拉寺与哲蚌寺"],
    coverGradient: "linear-gradient(135deg, #fdcb6e 0%, #e17055 50%, #6c5ce7 100%)",
  },

  // ===== 9. 北京 6日游 =====
  {
    trip: makeTrip(
      "seed-beijing-6d",
      "北京6日深度游",
      "故宫长城颐和园，天坛798南锣鼓巷，六天玩转帝都的历史底蕴与现代潮流。",
      "北京",
      "2024-10-01",
      "2024-10-06",
    ),
    places: [
      makePlace("seed-beijing-6d", 0, 0, "天安门广场", "attraction", 39.9087, 116.3974, { stayMinutes: 60, notes: "升旗仪式需早起" }),
      makePlace("seed-beijing-6d", 0, 1, "故宫博物院", "attraction", 39.9163, 116.3972, { stayMinutes: 300, notes: "需提前预约，珍宝馆钟表馆值得看" }),
      makePlace("seed-beijing-6d", 0, 2, "景山公园", "attraction", 39.924, 116.396, { stayMinutes: 60, notes: "俯瞰故宫全景" }),
      makePlace("seed-beijing-6d", 1, 0, "八达岭长城", "attraction", 40.359, 116.019, { stayMinutes: 300, notes: "不到长城非好汉，缆车或徒步" }),
      makePlace("seed-beijing-6d", 1, 1, "鸟巢", "attraction", 39.9929, 116.396, { stayMinutes: 60 }),
      makePlace("seed-beijing-6d", 1, 2, "水立方", "attraction", 39.993, 116.39, { stayMinutes: 60 }),
      makePlace("seed-beijing-6d", 2, 0, "颐和园", "attraction", 39.999, 116.275, { stayMinutes: 240, rating: 5 }),
      makePlace("seed-beijing-6d", 2, 1, "圆明园", "attraction", 40.008, 116.297, { stayMinutes: 120, notes: "西洋楼遗址" }),
      makePlace("seed-beijing-6d", 3, 0, "天坛公园", "attraction", 39.8822, 116.406, { stayMinutes: 120, rating: 4 }),
      makePlace("seed-beijing-6d", 3, 1, "前门大街", "shopping", 39.899, 116.395, { stayMinutes: 120, notes: "全聚德烤鸭" }),
      makePlace("seed-beijing-6d", 4, 0, "798艺术区", "attraction", 39.984, 116.495, { stayMinutes: 180, notes: "当代艺术展览" }),
      makePlace("seed-beijing-6d", 4, 1, "三里屯", "shopping", 39.933, 116.454, { stayMinutes: 120, notes: "潮流商圈夜生活" }),
      makePlace("seed-beijing-6d", 5, 0, "南锣鼓巷", "attraction", 39.937, 116.403, { stayMinutes: 120, notes: "胡同文化，文宇奶酪" }),
      makePlace("seed-beijing-6d", 5, 1, "什刹海", "attraction", 39.94, 116.385, { stayMinutes: 90, notes: "酒吧街，后海划船" }),
      makePlace("seed-beijing-6d", 5, 2, "恭王府", "attraction", 39.942, 116.383, { stayMinutes: 90, notes: "和珅府邸，福字碑" }),
    ],
    sourceVideo: {
      title: "超详细！北京6天5晚旅游攻略（正常人类版） 收藏直接用～",
      author: "叫我小颜呀呀嘿",
      bvid: "BV1PYPWeVEGJ",
      url: "https://www.bilibili.com/video/BV1PYPWeVEGJ",
      playCount: 279578,
      duration: "7:30",
    },
    tags: ["古都", "文化", "历史", "故宫"],
    estimatedBudget: 3500,
    bestSeason: "4-5月 / 9-10月",
    difficulty: "适中",
    highlights: [
      "故宫深度游珍宝馆钟表馆",
      "八达岭长城不到长城非好汉",
      "颐和园皇家园林漫步",
      "798艺术区当代艺术",
    ],
    dailyThemes: ["Day 1 - 天安门故宫", "Day 2 - 长城与奥运", "Day 3 - 颐和园圆明园", "Day 4 - 天坛与前门", "Day 5 - 798与三里屯", "Day 6 - 胡同与什刹海"],
    coverGradient: "linear-gradient(135deg, #c0392b 0%, #e74c3c 50%, #f39c12 100%)",
  },

  // ===== 10. 青岛 3日游 =====
  {
    trip: makeTrip(
      "seed-qingdao-3d",
      "青岛3日海滨游",
      "红瓦绿树碧海蓝天，栈桥八大关万国建筑，崂山访道，啤酒博物馆畅饮，感受胶东半岛的德式风情。",
      "青岛",
      "2024-10-01",
      "2024-10-03",
    ),
    places: [
      makePlace("seed-qingdao-3d", 0, 0, "栈桥", "attraction", 36.059, 120.316, { stayMinutes: 60, notes: "青岛地标，回澜阁" }),
      makePlace("seed-qingdao-3d", 0, 1, "八大关", "attraction", 36.052, 120.347, { stayMinutes: 150, notes: "万国建筑博览会，花石楼" }),
      makePlace("seed-qingdao-3d", 0, 2, "五四广场", "attraction", 36.063, 120.386, { stayMinutes: 60, notes: "五月的风雕塑" }),
      makePlace("seed-qingdao-3d", 1, 0, "崂山风景区", "attraction", 36.16, 120.62, { stayMinutes: 300, notes: "海上名山第一，太清宫" }),
      makePlace("seed-qingdao-3d", 1, 1, "青岛啤酒博物馆", "attraction", 36.08, 120.37, { stayMinutes: 90, notes: "百年青岛啤酒，免费品尝原浆" }),
      makePlace("seed-qingdao-3d", 2, 0, "金沙滩", "attraction", 35.965, 120.167, { stayMinutes: 180, notes: "亚洲第一滩" }),
      makePlace("seed-qingdao-3d", 2, 1, "胶州湾大桥", "attraction", 36.05, 120.2, { stayMinutes: 60, notes: "世界最长跨海大桥" }),
    ],
    sourceVideo: {
      title: "送你一份超详细的青岛三日旅游攻略 | 内含图文版",
      author: "迈得丘MadQ",
      bvid: "BV1RF41197aM",
      url: "https://www.bilibili.com/video/BV1RF41197aM",
      playCount: 1346848,
      duration: "9:44",
    },
    tags: ["海滨", "德式建筑", "啤酒", "休闲"],
    estimatedBudget: 1800,
    bestSeason: "5-10月",
    difficulty: "轻松",
    highlights: [
      "八大关万国建筑博览",
      "崂山海上名山第一",
      "青岛啤酒博物馆免费原浆",
      "金沙滩亚洲第一滩",
    ],
    dailyThemes: ["Day 1 - 栈桥与八大关", "Day 2 - 崂山与啤酒博物馆", "Day 3 - 金沙滩与跨海大桥"],
    coverGradient: "linear-gradient(135deg, #00b894 0%, #00cec9 50%, #0984e3 100%)",
  },

  // ===== 11. 新疆伊犁 7日游 =====
  {
    trip: makeTrip(
      "seed-xinjiang-7d",
      "新疆伊犁7日环线游",
      "赛里木湖、那拉提草原、巴音布鲁克九曲十八弯、喀拉峻人体草原，7天纵贯伊犁河谷最美风景线。",
      "新疆伊犁",
      "2024-10-01",
      "2024-10-07",
    ),
    places: [
      makePlace("seed-xinjiang-7d", 0, 0, "新疆国际大巴扎", "shopping", 43.79, 87.62, { stayMinutes: 150, notes: "乌鲁木齐集合，烤肉抓饭大盘鸡" }),
      makePlace("seed-xinjiang-7d", 1, 0, "赛里木湖", "attraction", 44.6, 81.17, { stayMinutes: 300, notes: "大西洋最后一滴眼泪" }),
      makePlace("seed-xinjiang-7d", 2, 0, "果子沟大桥", "attraction", 44.48, 81.08, { stayMinutes: 60, notes: "中国最美高速桥梁" }),
      makePlace("seed-xinjiang-7d", 2, 1, "那拉提草原", "attraction", 43.33, 84.47, { stayMinutes: 240, notes: "空中草原，骑马体验" }),
      makePlace("seed-xinjiang-7d", 3, 0, "巴音布鲁克草原", "attraction", 43.03, 84.27, { stayMinutes: 240, notes: "九曲十八弯日落，天鹅湖" }),
      makePlace("seed-xinjiang-7d", 4, 0, "喀拉峻草原", "attraction", 43.08, 81.97, { stayMinutes: 240, notes: "人体草原，世界自然遗产" }),
      makePlace("seed-xinjiang-7d", 5, 0, "特克斯八卦城", "attraction", 43.22, 81.84, { stayMinutes: 120, notes: "唯一没有红绿灯的八卦布局城市" }),
      makePlace("seed-xinjiang-7d", 5, 1, "伊宁喀赞其", "attraction", 43.91, 81.33, { stayMinutes: 120, notes: "蓝色小镇，维吾尔族风情" }),
      makePlace("seed-xinjiang-7d", 6, 0, "霍尔果斯口岸", "attraction", 44.2, 80.42, { stayMinutes: 120, notes: "中哈边境免税购物" }),
      makePlace("seed-xinjiang-7d", 6, 1, "霍城薰衣草基地", "attraction", 44.05, 81.25, { stayMinutes: 90, notes: "6-7月薰衣草花季最佳" }),
    ],
    sourceVideo: {
      title: "送你一份超详细的新疆伊犁7-8日旅游攻略 | 内含图文版",
      author: "迈得丘MadQ",
      bvid: "BV1194y1k7bw",
      url: "https://www.bilibili.com/video/BV1194y1k7bw",
      playCount: 872157,
      duration: "21:10",
    },
    tags: ["草原", "自驾", "湖泊", "民族风情"],
    estimatedBudget: 5500,
    bestSeason: "6-8月",
    difficulty: "挑战",
    highlights: [
      "赛里木湖大西洋最后一滴眼泪",
      "那拉提空中草原骑马",
      "巴音布鲁克九曲十八弯日落",
      "喀拉峻人体草原世界遗产",
    ],
    dailyThemes: ["Day 1 - 乌鲁木齐集合", "Day 2 - 赛里木湖", "Day 3 - 果子沟与那拉提", "Day 4 - 巴音布鲁克", "Day 5 - 喀拉峻", "Day 6 - 特克斯与伊宁", "Day 7 - 霍尔果斯口岸"],
    coverGradient: "linear-gradient(135deg, #55efc4 0%, #00b894 50%, #006266 100%)",
  },

  // ===== 12. 苏州 3日游 =====
  {
    trip: makeTrip(
      "seed-suzhou-3d",
      "苏州3日园林游",
      "拙政园留园狮子林，平江路山塘街漫步，品苏式园林之美与江南水乡的温婉韵味。",
      "苏州",
      "2024-10-01",
      "2024-10-03",
    ),
    places: [
      makePlace("seed-suzhou-3d", 0, 0, "拙政园", "attraction", 31.324, 120.631, { stayMinutes: 150, notes: "中国四大名园之首，需提前预约" }),
      makePlace("seed-suzhou-3d", 0, 1, "苏州博物馆", "attraction", 31.325, 120.629, { stayMinutes: 120, notes: "贝聿铭设计，免费但需预约" }),
      makePlace("seed-suzhou-3d", 0, 2, "平江路", "attraction", 31.318, 120.628, { stayMinutes: 120, notes: "宋代古街，评弹、苏式小吃" }),
      makePlace("seed-suzhou-3d", 1, 0, "留园", "attraction", 31.317, 120.596, { stayMinutes: 120, rating: 5, notes: "四大名园，太湖石冠云峰" }),
      makePlace("seed-suzhou-3d", 1, 1, "虎丘", "attraction", 31.322, 120.572, { stayMinutes: 120, notes: "吴中第一名胜，斜塔" }),
      makePlace("seed-suzhou-3d", 1, 2, "山塘街", "attraction", 31.333, 120.61, { stayMinutes: 120, notes: "七里山塘，夜景灯光" }),
      makePlace("seed-suzhou-3d", 2, 0, "狮子林", "attraction", 31.324, 120.629, { stayMinutes: 90, notes: "假山王国，迷宫式园林" }),
      makePlace("seed-suzhou-3d", 2, 1, "金鸡湖", "attraction", 31.312, 120.739, { stayMinutes: 120, notes: "现代苏州地标，东方之门" }),
      makePlace("seed-suzhou-3d", 2, 2, "诚品书店", "shopping", 31.312, 120.74, { stayMinutes: 90, notes: "大陆首家诚品，文艺打卡" }),
    ],
    sourceVideo: {
      title: "吐血总结！苏州三天两夜，人均800保姆级攻略",
      author: "ai鹿团子",
      bvid: "BV1UY4y1C7T2",
      url: "https://www.bilibili.com/video/BV1UY4y1C7T2",
      playCount: 1491430,
      duration: "2:33",
    },
    tags: ["江南", "园林", "古城", "水乡"],
    estimatedBudget: 1200,
    bestSeason: "3-5月 / 10-11月",
    difficulty: "轻松",
    highlights: [
      "拙政园四大名园之首",
      "贝聿铭设计苏州博物馆",
      "平江路宋代古街漫步",
      "金鸡湖现代苏州夜景",
    ],
    dailyThemes: ["Day 1 - 拙政园与平江路", "Day 2 - 留园虎丘与山塘街", "Day 3 - 狮子林与金鸡湖"],
    coverGradient: "linear-gradient(135deg, #fab1a0 0%, #fd79a8 50%, #6c5ce7 100%)",
  },

  // ===== 13. 南京 3日游 =====
  {
    trip: makeTrip(
      "seed-nanjing-3d",
      "南京3日古都游",
      "中山陵明孝陵总统府，夫子庙秦淮河夜景，感受六朝古都的历史厚重与现代活力。",
      "南京",
      "2024-10-01",
      "2024-10-03",
    ),
    places: [
      makePlace("seed-nanjing-3d", 0, 0, "中山陵", "attraction", 32.057, 118.846, { stayMinutes: 150, notes: "免费但需预约，392级台阶" }),
      makePlace("seed-nanjing-3d", 0, 1, "明孝陵", "attraction", 32.056, 118.838, { stayMinutes: 120, rating: 4, notes: "明太祖朱元璋陵墓" }),
      makePlace("seed-nanjing-3d", 0, 2, "美龄宫", "attraction", 32.053, 118.839, { stayMinutes: 60, notes: "宋美龄官邸，项链形态" }),
      makePlace("seed-nanjing-3d", 1, 0, "总统府", "attraction", 32.047, 118.795, { stayMinutes: 120, notes: "近代史博物馆" }),
      makePlace("seed-nanjing-3d", 1, 1, "1912街区", "shopping", 32.047, 118.797, { stayMinutes: 90, notes: "民国风情酒吧街" }),
      makePlace("seed-nanjing-3d", 1, 2, "新街口", "shopping", 32.043, 118.778, { stayMinutes: 120, notes: "中华第一商圈" }),
      makePlace("seed-nanjing-3d", 2, 0, "夫子庙", "attraction", 32.022, 118.786, { stayMinutes: 120, notes: "秦淮河风光带" }),
      makePlace("seed-nanjing-3d", 2, 1, "老门东", "attraction", 32.019, 118.781, { stayMinutes: 120, notes: "金陵小吃聚集地" }),
      makePlace("seed-nanjing-3d", 2, 2, "玄武湖", "attraction", 32.072, 118.804, { stayMinutes: 90, notes: "免费城市公园，划船" }),
    ],
    sourceVideo: {
      title: "【旅游攻略】总要去趟南京吧，看看这座烂漫的城市 | 3天2晚吃穿住行姆级超详细解说",
      author: "娴仔今天摸鱼了吗",
      bvid: "BV1gu411e7LY",
      url: "https://www.bilibili.com/video/BV1gu411e7LY",
      playCount: 578353,
      duration: "11:28",
    },
    tags: ["古都", "历史", "文化", "民国"],
    estimatedBudget: 1500,
    bestSeason: "3-5月 / 9-11月",
    difficulty: "轻松",
    highlights: [
      "中山陵392级台阶瞻仰",
      "总统府近代史博物馆",
      "秦淮河夫子庙夜景",
      "明孝陵神道石象路",
    ],
    dailyThemes: ["Day 1 - 中山陵与明孝陵", "Day 2 - 总统府与新街口", "Day 3 - 夫子庙与玄武湖"],
    coverGradient: "linear-gradient(135deg, #fdcb6e 0%, #e67e22 50%, #d35400 100%)",
  },

  // ===== 14. 长沙 3日游 =====
  {
    trip: makeTrip(
      "seed-changsha-3d",
      "长沙3日逛吃游",
      "橘子洲头看万山红遍，岳麓书院品千年文脉，五一广场喝茶颜悦色，不夜城长沙逛吃不停。",
      "长沙",
      "2024-10-01",
      "2024-10-03",
    ),
    places: [
      makePlace("seed-changsha-3d", 0, 0, "橘子洲", "attraction", 28.201, 112.972, { stayMinutes: 120, notes: "青年毛泽东雕像，电瓶车游览" }),
      makePlace("seed-changsha-3d", 0, 1, "五一广场", "shopping", 28.198, 112.977, { stayMinutes: 150, notes: "长沙最繁华商圈" }),
      makePlace("seed-changsha-3d", 0, 2, "黄兴路步行街", "shopping", 28.195, 112.976, { stayMinutes: 120, notes: "臭豆腐、糖油粑粑" }),
      makePlace("seed-changsha-3d", 1, 0, "岳麓山", "attraction", 28.187, 112.942, { stayMinutes: 180, notes: "索道上山，滑道下山" }),
      makePlace("seed-changsha-3d", 1, 1, "岳麓书院", "attraction", 28.185, 112.943, { stayMinutes: 90, rating: 4, notes: "千年学府" }),
      makePlace("seed-changsha-3d", 1, 2, "爱晚亭", "attraction", 28.188, 112.939, { stayMinutes: 30, notes: "停车坐爱枫林晚" }),
      makePlace("seed-changsha-3d", 2, 0, "湖南博物院", "attraction", 28.214, 112.987, { stayMinutes: 180, notes: "马王堆汉墓，辛追夫人" }),
      makePlace("seed-changsha-3d", 2, 1, "太平老街", "attraction", 28.196, 112.972, { stayMinutes: 120, notes: "贾谊故居，茶颜悦色总店" }),
      makePlace("seed-changsha-3d", 2, 2, "IFS国金中心", "shopping", 28.201, 112.979, { stayMinutes: 90, notes: "顶层KAWS雕塑打卡" }),
    ],
    sourceVideo: {
      title: "53家美食大合集！长沙旅游保姆级攻略！！",
      author: "猴儿甜猴儿甜",
      bvid: "BV1TMe3zjErJ",
      url: "https://www.bilibili.com/video/BV1TMe3zjErJ",
      playCount: 3711789,
      duration: "12:32",
    },
    tags: ["美食", "网红", "夜生活", "文化"],
    estimatedBudget: 1500,
    bestSeason: "3-5月 / 9-11月",
    difficulty: "轻松",
    highlights: [
      "橘子洲头青年毛泽东雕像",
      "岳麓书院千年学府",
      "茶颜悦色总店打卡",
      "湖南博物院马王堆汉墓",
    ],
    dailyThemes: ["Day 1 - 橘子洲与五一广场", "Day 2 - 岳麓山与书院", "Day 3 - 博物院与老街"],
    coverGradient: "linear-gradient(135deg, #ff6348 0%, #e74c3c 50%, #c0392b 100%)",
  },

  // ===== 15. 三亚 5日游 =====
  {
    trip: makeTrip(
      "seed-sanya-5d",
      "三亚5日海岛游",
      "亚龙湾天涯海角蜈支洲岛，椰风海韵阳光沙滩，热带天堂雨林探秘，享受东方夏威夷的度假时光。",
      "三亚",
      "2024-10-01",
      "2024-10-05",
    ),
    places: [
      makePlace("seed-sanya-5d", 0, 0, "亚龙湾", "attraction", 18.192, 109.637, { stayMinutes: 240, notes: "天下第一湾，沙滩细腻" }),
      makePlace("seed-sanya-5d", 0, 1, "亚龙湾热带天堂森林公园", "attraction", 18.214, 109.648, { stayMinutes: 180, notes: "非诚勿扰2取景地" }),
      makePlace("seed-sanya-5d", 1, 0, "蜈支洲岛", "attraction", 18.313, 109.763, { stayMinutes: 360, notes: "中国马尔代夫，需乘船前往" }),
      makePlace("seed-sanya-5d", 2, 0, "天涯海角", "attraction", 18.245, 109.347, { stayMinutes: 120, notes: "天涯石、海角石" }),
      makePlace("seed-sanya-5d", 2, 1, "南山文化旅游区", "attraction", 18.291, 109.201, { stayMinutes: 180, notes: "108米海上观音像" }),
      makePlace("seed-sanya-5d", 3, 0, "呀诺达雨林文化旅游区", "attraction", 18.378, 109.752, { stayMinutes: 240, notes: "热带雨林，滑索体验" }),
      makePlace("seed-sanya-5d", 3, 1, "槟榔谷", "attraction", 18.366, 109.711, { stayMinutes: 150, notes: "黎苗文化体验" }),
      makePlace("seed-sanya-5d", 4, 0, "三亚湾", "attraction", 18.241, 109.503, { stayMinutes: 120, notes: "椰梦长廊看日落" }),
      makePlace("seed-sanya-5d", 4, 1, "第一市场", "shopping", 18.258, 109.509, { stayMinutes: 120, notes: "海鲜加工，砍价" }),
    ],
    sourceVideo: {
      title: "三亚最全攻略 讲得清清楚楚 超详细 无广纯干货",
      author: "码语者和杰妮",
      bvid: "BV1CZ8EzHEEg",
      url: "https://www.bilibili.com/video/BV1CZ8EzHEEg",
      playCount: 151179,
      duration: "13:48",
    },
    tags: ["海岛", "度假", "热带", "潜水"],
    estimatedBudget: 4500,
    bestSeason: "10-3月（避开台风季）",
    difficulty: "轻松",
    highlights: [
      "蜈支洲岛中国马尔代夫",
      "亚龙湾天下第一湾",
      "南山108米海上观音",
      "呀诺达热带雨林滑索",
    ],
    dailyThemes: ["Day 1 - 亚龙湾", "Day 2 - 蜈支洲岛", "Day 3 - 天涯海角与南山", "Day 4 - 呀诺达雨林", "Day 5 - 三亚湾与海鲜市场"],
    coverGradient: "linear-gradient(135deg, #48dbfb 0%, #0abde3 50%, #006ba6 100%)",
  },

  // ===== 16. 桂林阳朔 3日游 =====
  {
    trip: makeTrip(
      "seed-guilin-3d",
      "桂林阳朔3日山水游",
      "桂林山水甲天下，漓江竹筏漂流，阳朔十里画廊骑行，遇龙河畔赏烟雨喀斯特峰林。",
      "桂林-阳朔",
      "2024-10-01",
      "2024-10-03",
    ),
    places: [
      makePlace("seed-guilin-3d", 0, 0, "象鼻山", "attraction", 25.262, 110.293, { stayMinutes: 90, notes: "桂林城徽" }),
      makePlace("seed-guilin-3d", 0, 1, "两江四湖", "attraction", 25.27, 110.29, { stayMinutes: 90, notes: "夜游最佳，日月双塔" }),
      makePlace("seed-guilin-3d", 0, 2, "东西巷", "shopping", 25.273, 110.299, { stayMinutes: 90, notes: "明清古街，桂林米粉" }),
      makePlace("seed-guilin-3d", 1, 0, "漓江", "attraction", 25.33, 110.29, { stayMinutes: 300, notes: "桂林→阳朔游船，4小时" }),
      makePlace("seed-guilin-3d", 1, 1, "兴坪古镇", "attraction", 24.948, 110.648, { stayMinutes: 120, notes: "20元人民币背景地" }),
      makePlace("seed-guilin-3d", 1, 2, "阳朔西街", "shopping", 24.773, 110.489, { stayMinutes: 150, notes: "洋人街，啤酒鱼" }),
      makePlace("seed-guilin-3d", 2, 0, "遇龙河", "attraction", 24.795, 110.439, { stayMinutes: 180, notes: "竹筏漂流，宁静田园" }),
      makePlace("seed-guilin-3d", 2, 1, "十里画廊", "attraction", 24.767, 110.46, { stayMinutes: 120, notes: "骑行最佳，大榕树、月亮山" }),
    ],
    sourceVideo: {
      title: "送你一份超详细的桂林+阳朔三日旅游攻略 | 内含图文版",
      author: "迈得丘MadQ",
      bvid: "BV1CEJE6rEzR",
      url: "https://www.bilibili.com/video/BV1CEJE6rEzR",
      playCount: 149811,
      duration: "17:23",
    },
    tags: ["山水", "竹筏", "喀斯特", "骑行"],
    estimatedBudget: 2000,
    bestSeason: "4-10月",
    difficulty: "适中",
    highlights: [
      "漓江游船桂林到阳朔",
      "20元人民币背景兴坪",
      "遇龙河竹筏宁静漂流",
      "十里画廊骑行赏峰林",
    ],
    dailyThemes: ["Day 1 - 桂林市区与夜游", "Day 2 - 漓江漂流到阳朔", "Day 3 - 遇龙河与十里画廊"],
    coverGradient: "linear-gradient(135deg, #55efc4 0%, #00b894 50%, #00cec9 100%)",
  },

  // ===== 17. 黄山 2日游 =====
  {
    trip: makeTrip(
      "seed-huangshan-2d",
      "黄山2日云海游",
      "五岳归来不看山，黄山归来不看岳。迎客松、光明顶日出、西海大峡谷，两日领略黄山奇松怪石云海。",
      "黄山",
      "2024-10-01",
      "2024-10-02",
    ),
    places: [
      makePlace("seed-huangshan-2d", 0, 0, "玉屏索道", "transport", 30.118, 118.369, { stayMinutes: 30, notes: "前山入口，索道上山" }),
      makePlace("seed-huangshan-2d", 0, 1, "迎客松", "attraction", 30.131, 118.367, { stayMinutes: 30, notes: "黄山标志性景观" }),
      makePlace("seed-huangshan-2d", 0, 2, "光明顶", "attraction", 30.136, 118.358, { stayMinutes: 90, notes: "第二高峰，日出日落最佳" }),
      makePlace("seed-huangshan-2d", 0, 3, "飞来石", "attraction", 30.135, 118.364, { stayMinutes: 30, notes: "红楼梦片头石" }),
      makePlace("seed-huangshan-2d", 1, 0, "西海大峡谷", "attraction", 30.139, 118.354, { stayMinutes: 180, notes: "梦幻景区，栈道惊险" }),
      makePlace("seed-huangshan-2d", 1, 1, "丹霞峰", "attraction", 30.139, 118.357, { stayMinutes: 60, notes: "看日出备选点" }),
      makePlace("seed-huangshan-2d", 1, 2, "云谷索道", "transport", 30.151, 118.375, { stayMinutes: 30, notes: "后山下山索道" }),
    ],
    sourceVideo: {
      title: "别怕！老少皆宜的懒人版黄山一日速通攻略来了",
      author: "迈得丘MadQ",
      bvid: "BV1qDR9BJEiM",
      url: "https://www.bilibili.com/video/BV1qDR9BJEiM",
      playCount: 125383,
      duration: "12:46",
    },
    tags: ["名山", "日出", "云海", "徒步"],
    estimatedBudget: 1800,
    bestSeason: "4-5月 / 9-10月",
    difficulty: "挑战",
    highlights: [
      "迎客松黄山标志性景观",
      "光明顶日出云海",
      "西海大峡谷梦幻景区",
      "飞来石红楼梦片头石",
    ],
    dailyThemes: ["Day 1 - 玉屏索道上山与光明顶日落", "Day 2 - 西海大峡谷下山"],
    coverGradient: "linear-gradient(135deg, #dfe6e9 0%, #636e72 50%, #2d3436 100%)",
  },

  // ===== 18. 哈尔滨 3日游 =====
  {
    trip: makeTrip(
      "seed-harbin-3d",
      "哈尔滨3日冰雪游",
      "中央大街索菲亚教堂圣索菲亚，冰雪大世界梦幻之旅，感受东方莫斯科的俄式风情与北国冰城魅力。",
      "哈尔滨",
      "2024-12-01",
      "2024-12-03",
    ),
    places: [
      makePlace("seed-harbin-3d", 0, 0, "中央大街", "shopping", 45.773, 126.626, { stayMinutes: 150, notes: "百年老街，马迭尔冰棍、红肠" }),
      makePlace("seed-harbin-3d", 0, 1, "圣索菲亚大教堂", "attraction", 45.776, 126.63, { stayMinutes: 60, notes: "拜占庭风格，夜景灯光" }),
      makePlace("seed-harbin-3d", 0, 2, "防洪纪念塔", "attraction", 45.782, 126.628, { stayMinutes: 30, notes: "松花江畔" }),
      makePlace("seed-harbin-3d", 1, 0, "冰雪大世界", "attraction", 45.815, 126.596, { stayMinutes: 300, notes: "冬季限定，冰雕灯光，下午入园" }),
      makePlace("seed-harbin-3d", 1, 1, "太阳岛", "attraction", 45.806, 126.607, { stayMinutes: 120, notes: "雪博会，冬季雪雕" }),
      makePlace("seed-harbin-3d", 2, 0, "东北虎林园", "attraction", 45.835, 126.625, { stayMinutes: 120, notes: "东北虎观赏" }),
      makePlace("seed-harbin-3d", 2, 1, "果戈里大街", "shopping", 45.763, 126.646, { stayMinutes: 90, notes: "俄式建筑，秋林公司" }),
      makePlace("seed-harbin-3d", 2, 2, "老道外", "attraction", 45.786, 126.651, { stayMinutes: 90, notes: "中华巴洛克街区" }),
    ],
    sourceVideo: {
      title: "送你一份超详细的哈尔滨三日旅游攻略 | 内含图文版",
      author: "迈得丘MadQ",
      bvid: "BV1Uw411V7M2",
      url: "https://www.bilibili.com/video/BV1Uw411V7M2",
      playCount: 362281,
      duration: "10:16",
    },
    tags: ["冰雪", "俄式风情", "夜景", "冬季"],
    estimatedBudget: 2500,
    bestSeason: "12-2月（冰雪季）",
    difficulty: "适中",
    highlights: [
      "冰雪大世界冰雕灯光",
      "圣索菲亚拜占庭教堂",
      "中央大街百年俄式老街",
      "松花江冰雪活动",
    ],
    dailyThemes: ["Day 1 - 中央大街与索菲亚教堂", "Day 2 - 冰雪大世界与太阳岛", "Day 3 - 虎林园与老道外"],
    coverGradient: "linear-gradient(135deg, #dfe6e9 0%, #74b9ff 50%, #0984e3 100%)",
  },

  // ===== 19. 武汉 3日游 =====
  {
    trip: makeTrip(
      "seed-wuhan-3d",
      "武汉3日江城游",
      "黄鹤楼俯瞰长江，东湖樱花烂漫，户部巷热干面，武汉大学樱园，感受九省通衢的江湖气。",
      "武汉",
      "2024-10-01",
      "2024-10-03",
    ),
    places: [
      makePlace("seed-wuhan-3d", 0, 0, "黄鹤楼", "attraction", 30.545, 114.301, { stayMinutes: 120, rating: 4, notes: "天下江山第一楼" }),
      makePlace("seed-wuhan-3d", 0, 1, "户部巷", "restaurant", 30.548, 114.304, { stayMinutes: 90, notes: "热干面、豆皮、鸭脖" }),
      makePlace("seed-wuhan-3d", 0, 2, "武汉长江大桥", "attraction", 30.549, 114.287, { stayMinutes: 60, notes: "万里长江第一桥" }),
      makePlace("seed-wuhan-3d", 1, 0, "东湖", "attraction", 30.55, 114.407, { stayMinutes: 180, notes: "中国最大城中湖，骑行" }),
      makePlace("seed-wuhan-3d", 1, 1, "武汉大学", "attraction", 30.539, 114.36, { stayMinutes: 120, notes: "樱花季3月最佳，需预约" }),
      makePlace("seed-wuhan-3d", 1, 2, "楚河汉街", "shopping", 30.558, 114.369, { stayMinutes: 120, notes: "民国风商业街" }),
      makePlace("seed-wuhan-3d", 2, 0, "归元寺", "attraction", 30.543, 114.259, { stayMinutes: 90, notes: "武汉四大佛教丛林之一" }),
      makePlace("seed-wuhan-3d", 2, 1, "晴川阁", "attraction", 30.553, 114.277, { stayMinutes: 60, notes: "楚天第一名楼" }),
      makePlace("seed-wuhan-3d", 2, 2, "江汉路步行街", "shopping", 30.581, 114.288, { stayMinutes: 120, notes: "百年商业街，近代建筑" }),
    ],
    sourceVideo: {
      title: "一条视频搞懂武汉！地铁线路+住宿+景点全攻略",
      author: "阿眯sn",
      bvid: "BV1NaWvzQExU",
      url: "https://www.bilibili.com/video/BV1NaWvzQExU",
      playCount: 172593,
      duration: "14:45",
    },
    tags: ["江城", "美食", "樱花", "历史"],
    estimatedBudget: 1500,
    bestSeason: "3-4月（樱花季）/ 10-11月",
    difficulty: "轻松",
    highlights: [
      "黄鹤楼天下江山第一楼",
      "武汉大学樱花季3月",
      "户部巷热干面豆皮",
      "东湖中国最大城中湖骑行",
    ],
    dailyThemes: ["Day 1 - 黄鹤楼与长江大桥", "Day 2 - 东湖与武大", "Day 3 - 归元寺与江汉路"],
    coverGradient: "linear-gradient(135deg, #ff7675 0%, #fd79a8 50%, #6c5ce7 100%)",
  },

  // ===== 20. 九寨沟 3日游 =====
  {
    trip: makeTrip(
      "seed-jiuzhaigou-3d",
      "九寨沟3日水景游",
      "九寨归来不看水，五花海五彩池诺日朗瀑布，Y字形沟谷徒步，沉浸式感受童话世界的水色魔法。",
      "九寨沟",
      "2024-10-01",
      "2024-10-03",
    ),
    places: [
      makePlace("seed-jiuzhaigou-3d", 0, 0, "树正沟", "attraction", 33.263, 103.905, { stayMinutes: 180, notes: "入门沟段，树正群海、火花海" }),
      makePlace("seed-jiuzhaigou-3d", 0, 1, "树正寨", "attraction", 33.268, 103.908, { stayMinutes: 60, notes: "藏族村寨体验" }),
      makePlace("seed-jiuzhaigou-3d", 1, 0, "日则沟", "attraction", 33.169, 103.899, { stayMinutes: 300, notes: "精华沟段，五花海、珍珠滩瀑布" }),
      makePlace("seed-jiuzhaigou-3d", 1, 1, "五花海", "attraction", 33.168, 103.9, { stayMinutes: 90, notes: "九寨沟一绝，孔雀蓝湖水" }),
      makePlace("seed-jiuzhaigou-3d", 1, 2, "珍珠滩瀑布", "attraction", 33.174, 103.901, { stayMinutes: 60, notes: "西游记片尾取景地" }),
      makePlace("seed-jiuzhaigou-3d", 2, 0, "则查洼沟", "attraction", 33.223, 103.918, { stayMinutes: 180, notes: "长海、五彩池" }),
      makePlace("seed-jiuzhaigou-3d", 2, 1, "长海", "attraction", 33.198, 103.925, { stayMinutes: 60, notes: "九寨沟最大海子" }),
      makePlace("seed-jiuzhaigou-3d", 2, 2, "五彩池", "attraction", 33.213, 103.919, { stayMinutes: 60, notes: "最小而色彩最丰富" }),
    ],
    sourceVideo: {
      title: "九寨沟避开人潮暴击！用我这招独享整片海子 | 内附攻略图文版",
      author: "迈得丘MadQ",
      bvid: "BV1ddS1BLEzt",
      url: "https://www.bilibili.com/video/BV1ddS1BLEzt",
      playCount: 637253,
      duration: "13:59",
    },
    tags: ["水景", "自然", "世界遗产", "藏族"],
    estimatedBudget: 3000,
    bestSeason: "9-11月（秋季彩林）",
    difficulty: "适中",
    highlights: [
      "五花海孔雀蓝湖水",
      "珍珠滩瀑布西游记取景",
      "长海九寨沟最大海子",
      "五彩池色彩最丰富",
    ],
    dailyThemes: ["Day 1 - 树正沟入门", "Day 2 - 日则沟精华段", "Day 3 - 则查洼沟长海"],
    coverGradient: "linear-gradient(135deg, #a8e6cf 0%, #48dbfb 50%, #0a3d62 100%)",
  },

  // ===== 21. 凤凰古城 2日游 =====
  {
    trip: makeTrip(
      "seed-fenghuang-2d",
      "凤凰古城2日边城游",
      "沈从文笔下边城，沱江泛舟吊脚楼，虹桥风雨夜色，感受湘西苗族风情与千年古城韵味。",
      "凤凰古城",
      "2024-10-01",
      "2024-10-02",
    ),
    places: [
      makePlace("seed-fenghuang-2d", 0, 0, "沱江泛舟", "attraction", 27.949, 109.6, { stayMinutes: 60, notes: "竹筏游沱江，看吊脚楼" }),
      makePlace("seed-fenghuang-2d", 0, 1, "虹桥", "attraction", 27.948, 109.6, { stayMinutes: 60, notes: "风雨桥，登楼看全景" }),
      makePlace("seed-fenghuang-2d", 0, 2, "东门城楼", "attraction", 27.949, 109.601, { stayMinutes: 30, notes: "古城墙" }),
      makePlace("seed-fenghuang-2d", 0, 3, "沱江跳岩", "attraction", 27.95, 109.599, { stayMinutes: 30, notes: "网红拍照点" }),
      makePlace("seed-fenghuang-2d", 1, 0, "沈从文故居", "attraction", 27.948, 109.599, { stayMinutes: 60, notes: "边城作者故居" }),
      makePlace("seed-fenghuang-2d", 1, 1, "熊希龄故居", "attraction", 27.949, 109.598, { stayMinutes: 45, notes: "民国总理故居" }),
      makePlace("seed-fenghuang-2d", 1, 2, "南方长城", "attraction", 27.993, 109.637, { stayMinutes: 120, notes: "苗疆长城，距古城16km" }),
      makePlace("seed-fenghuang-2d", 1, 3, "凤凰夜景", "attraction", 27.948, 109.6, { stayMinutes: 90, notes: "沱江两岸灯光，酒吧街" }),
    ],
    sourceVideo: {
      title: "凤凰古城2日游｜茶饼好吃到立刻回购！沱江游船值不值？",
      author: "小草漫游",
      bvid: "BV11c9hBhEvH",
      url: "https://www.bilibili.com/video/BV11c9hBhEvH",
      playCount: 26651,
      duration: "9:00",
    },
    tags: ["古城", "水乡", "苗族", "文艺"],
    estimatedBudget: 1200,
    bestSeason: "3-11月",
    difficulty: "轻松",
    highlights: [
      "沱江泛舟看吊脚楼",
      "沈从文边城文化寻踪",
      "沱江跳岩网红拍照",
      "南方长城苗疆边墙",
    ],
    dailyThemes: ["Day 1 - 沱江泛舟与古城漫游", "Day 2 - 名人故居与南方长城"],
    coverGradient: "linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 50%, #e17055 100%)",
  },

  // ===== 22. 呼伦贝尔 7日游 =====
  {
    trip: makeTrip(
      "seed-hulunbeier-7d",
      "呼伦贝尔7日草原游",
      "莫日格勒河九曲十八弯，额尔古纳湿地根河湿地，满洲里口岸室韦俄罗斯风情，纵马驰骋呼伦贝尔大草原。",
      "呼伦贝尔",
      "2024-07-01",
      "2024-07-07",
    ),
    places: [
      makePlace("seed-hulunbeier-7d", 0, 0, "海拉尔区", "transport", 49.212, 119.766, { stayMinutes: 60, notes: "集合地，备物资" }),
      makePlace("seed-hulunbeier-7d", 0, 1, "莫日格勒河", "attraction", 49.279, 119.926, { stayMinutes: 120, notes: "天下第一曲水" }),
      makePlace("seed-hulunbeier-7d", 1, 0, "额尔古纳湿地", "attraction", 50.243, 120.183, { stayMinutes: 120, notes: "亚洲第一湿地" }),
      makePlace("seed-hulunbeier-7d", 1, 1, "白桦林景区", "attraction", 50.323, 120.255, { stayMinutes: 90, notes: "童话白桦林" }),
      makePlace("seed-hulunbeier-7d", 2, 0, "恩和俄罗斯族民族乡", "attraction", 50.455, 120.488, { stayMinutes: 180, notes: "华俄后裔，木刻楞民居" }),
      makePlace("seed-hulunbeier-7d", 2, 1, "室韦", "attraction", 50.631, 120.687, { stayMinutes: 150, notes: "中俄边境小镇，隔河望俄罗斯" }),
      makePlace("seed-hulunbeier-7d", 3, 0, "莫尔道嘎国家森林公园", "attraction", 50.872, 120.754, { stayMinutes: 240, notes: "南有西双版纳，北有莫尔道嘎" }),
      makePlace("seed-hulunbeier-7d", 4, 0, "黑山头", "attraction", 50.214, 119.464, { stayMinutes: 240, notes: "看日落，骑马体验" }),
      makePlace("seed-hulunbeier-7d", 5, 0, "满洲里", "attraction", 49.597, 117.428, { stayMinutes: 300, notes: "中俄蒙边境，套娃广场" }),
      makePlace("seed-hulunbeier-7d", 5, 1, "国门景区", "attraction", 49.609, 117.429, { stayMinutes: 90, notes: "中俄边境国门" }),
      makePlace("seed-hulunbeier-7d", 6, 0, "呼伦湖", "attraction", 49.108, 117.359, { stayMinutes: 150, notes: "中国第五大湖" }),
      makePlace("seed-hulunbeier-7d", 6, 1, "巴尔虎蒙古部落", "attraction", 49.326, 118.118, { stayMinutes: 180, notes: "蒙古包住宿，那达慕表演" }),
    ],
    sourceVideo: {
      title: "【呼伦贝尔】难忘的夏天！沉浸式记录7天6晚自驾游全攻略",
      author: "金珠拉姆",
      bvid: "BV18AgQzBEWk",
      url: "https://www.bilibili.com/video/BV18AgQzBEWk",
      playCount: 72646,
      duration: "18:49",
    },
    tags: ["草原", "自驾", "边境", "民族风情"],
    estimatedBudget: 6000,
    bestSeason: "6-8月（夏季绿草）",
    difficulty: "挑战",
    highlights: [
      "莫日格勒河天下第一曲水",
      "额尔古纳湿地亚洲第一",
      "室韦中俄边境小镇",
      "满洲里套娃广场国门",
    ],
    dailyThemes: ["Day 1 - 海拉尔与莫日格勒", "Day 2 - 额尔古纳湿地", "Day 3 - 恩和室韦俄罗斯风情", "Day 4 - 莫尔道嘎森林", "Day 5 - 黑山头骑马日落", "Day 6 - 满洲里国门", "Day 7 - 呼伦湖与巴尔虎"],
    coverGradient: "linear-gradient(135deg, #55efc4 0%, #00b894 50%, #006266 100%)",
  },
];

// ============ 查询辅助函数 ============

/** 根据 tripId 获取种子模板 */
export function getSeedTemplate(tripId: string): SeedTemplate | undefined {
  return SEED_TEMPLATES.find((t) => t.trip.id === tripId);
}

/** 根据 tripId 获取种子模板的地点列表 */
export function getSeedPlaces(tripId: string): Place[] {
  return getSeedTemplate(tripId)?.places ?? [];
}

/** 获取所有种子模板的 Trip 列表 */
export function getSeedTrips(): Trip[] {
  return SEED_TEMPLATES.map((t) => t.trip);
}

/** 获取所有标签（去重，按出现频次降序） */
export function getAllTags(): string[] {
  const tagCount = new Map<string, number>();
  for (const t of SEED_TEMPLATES) {
    for (const tag of t.tags) {
      tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(tagCount.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);
}
