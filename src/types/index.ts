// ==================== 行程相关类型 ====================

/** 行程状态 */
export type TripStatus = "planning" | "ongoing" | "completed" | "archived";

/** 可见性 */
export type Visibility = "private" | "public" | "friends";

/** 行程 */
export interface Trip {
  id: string;
  userId: string;
  title: string;
  description?: string;
  destination: string;
  startDate: string; // ISO date string
  endDate: string;
  coverImage?: string;
  status: TripStatus;
  visibility: Visibility;
  baseCurrency: string; // 基准货币，如 CNY
  budgetLimit?: number; // 预算上限
  /** 行程参与者名单（用于费用拆分） */
  participants?: string[];
  createdAt: string;
  updatedAt: string;
  /** 云端记录 ID，同步后赋值；未同步则为 undefined */
  cloudId?: string;
}

// ==================== 日程编排相关类型 ====================

/** 地点类型 */
export type PlaceType =
  | "attraction"
  | "restaurant"
  | "hotel"
  | "transport"
  | "shopping"
  | "other";

/** 地点（行程中的单个停靠点） */
export interface Place {
  id: string;
  tripId: string;
  dayIndex: number; // 第几天（从 0 开始）
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  type: PlaceType;
  stayMinutes?: number; // 停留分钟数
  order: number; // 当日顺序
  notes?: string;
  rating?: number; // 1-5
  imageUrl?: string;
  websiteUrl?: string;
  /** 云端记录 ID */
  cloudId?: string;
}

/** 一天的行程 */
export interface ItineraryDay {
  dayIndex: number;
  date: string;
  places: Place[];
}

// ==================== 预算管理相关类型 ====================

/** 支出分类 */
export type ExpenseCategory =
  | "transport"
  | "accommodation"
  | "food"
  | "ticket"
  | "shopping"
  | "other";

/** 支出记录 */
export interface Expense {
  id: string;
  tripId: string;
  placeId?: string; // 关联的地点（可选）
  category: ExpenseCategory;
  amount: number; // 原始金额
  currency: string; // 原始货币，如 USD
  convertedAmount?: number; // 换算后的金额
  date: string;
  description?: string;
  /** 付款人（参与者名单中的一个） */
  paidBy?: string;
  /** 分摊人列表（默认为所有参与者） */
  splitAmong?: string[];
  /** 云端记录 ID */
  cloudId?: string;
}

/** 预算统计 */
export interface BudgetStats {
  totalSpent: number;
  byCategory: Record<ExpenseCategory, number>;
  byDay: { dayIndex: number; amount: number }[];
  remainingBudget?: number;
  overBudget: boolean;
}

// ==================== 攻略笔记相关类型 ====================

/** 笔记 */
export interface Note {
  id: string;
  tripId: string;
  placeId?: string;
  title: string;
  content: string; // 富文本 HTML
  createdAt: string;
  updatedAt: string;
  /** 云端记录 ID */
  cloudId?: string;
}

// ==================== 打包清单相关类型 ====================

/** 打包分类 */
export type PackingCategory =
  | "essentials"
  | "clothing"
  | "toiletries"
  | "electronics"
  | "documents"
  | "miscellaneous";

/** 打包物品 */
export interface PackingItem {
  id: string;
  tripId: string;
  name: string;
  category: PackingCategory;
  packed: boolean;
  quantity: number;
  /** 是否为系统智能推荐 */
  suggested: boolean;
  notes?: string;
  /** 云端记录 ID */
  cloudId?: string;
}

// ==================== 用户相关类型 ====================

/** 用户资料 */
export interface Profile {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  createdAt: string;
}

/** 行程模板（社区分享） */
export interface TripTemplate {
  id: string;
  userId: string;
  tripId: string;
  title: string;
  description: string;
  destination: string;
  days: number;
  coverImage?: string;
  tags: string[];
  forkCount: number;
  likeCount: number;
  createdAt: string;
}

// ==================== 地图相关类型 ====================

/** 地图标记 */
export interface MapMarker {
  id: string;
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  type: PlaceType;
  dayIndex: number;
}

/** 路线段 */
export interface RouteSegment {
  from: MapMarker;
  to: MapMarker;
  distance?: number; // 米
  duration?: number; // 分钟
}
