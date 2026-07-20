import type { ExpenseCategory, PlaceType, TripStatus, PackingCategory } from "@/types";

/** 支出分类配置 */
export const EXPENSE_CATEGORIES: Record<
  ExpenseCategory,
  { label: string; color: string; icon: string }
> = {
  transport: { label: "交通", color: "#3b82f6", icon: "Plane" },
  accommodation: { label: "住宿", color: "#8b5cf6", icon: "BedDouble" },
  food: { label: "餐饮", color: "#f59e0b", icon: "Utensils" },
  ticket: { label: "门票", color: "#ef4444", icon: "Ticket" },
  shopping: { label: "购物", color: "#ec4899", icon: "ShoppingBag" },
  other: { label: "其他", color: "#6b7280", icon: "Wallet" },
};

/** 地点类型配置 */
export const PLACE_TYPES: Record<
  PlaceType,
  { label: string; color: string; icon: string }
> = {
  attraction: { label: "景点", color: "#10b981", icon: "Camera" },
  restaurant: { label: "餐厅", color: "#f59e0b", icon: "Utensils" },
  hotel: { label: "住宿", color: "#8b5cf6", icon: "BedDouble" },
  transport: { label: "交通", color: "#3b82f6", icon: "Plane" },
  shopping: { label: "购物", color: "#ec4899", icon: "ShoppingBag" },
  other: { label: "其他", color: "#6b7280", icon: "MapPin" },
};

/** 行程状态配置（variant 对应 Badge 组件变体） */
export const TRIP_STATUS: Record<
  TripStatus,
  { label: string; variant: "primary" | "success" | "default" | "default" }
> = {
  planning: { label: "规划中", variant: "primary" },
  ongoing: { label: "进行中", variant: "success" },
  completed: { label: "已完成", variant: "default" },
  archived: { label: "已归档", variant: "default" },
};

/** 打包分类配置 */
export const PACKING_CATEGORIES: Record<
  PackingCategory,
  { label: string; color: string; icon: string }
> = {
  essentials: { label: "必备物品", color: "#ef4444", icon: "PackageCheck" },
  clothing: { label: "衣物", color: "#3b82f6", icon: "Shirt" },
  toiletries: { label: "洗漱用品", color: "#10b981", icon: "Sparkles" },
  electronics: { label: "电子产品", color: "#8b5cf6", icon: "Smartphone" },
  documents: { label: "证件文件", color: "#f59e0b", icon: "FileText" },
  miscellaneous: { label: "其他", color: "#6b7280", icon: "Briefcase" },
};

/** 常用货币列表 */
export const CURRENCIES = [
  { code: "CNY", label: "人民币 ¥", symbol: "¥" },
  { code: "USD", label: "美元 $", symbol: "$" },
  { code: "EUR", label: "欧元 €", symbol: "€" },
  { code: "GBP", label: "英镑 £", symbol: "£" },
  { code: "JPY", label: "日元 ¥", symbol: "¥" },
  { code: "KRW", label: "韩元 ₩", symbol: "₩" },
  { code: "HKD", label: "港币 HK$", symbol: "HK$" },
  { code: "TWD", label: "新台币 NT$", symbol: "NT$" },
  { code: "THB", label: "泰铢 ฿", symbol: "฿" },
  { code: "SGD", label: "新加坡元 S$", symbol: "S$" },
  { code: "AUD", label: "澳元 A$", symbol: "A$" },
  { code: "CAD", label: "加元 C$", symbol: "C$" },
];

// 注：导航菜单项定义在 src/components/layout/Navbar.tsx 中
// 因为需要直接引用 lucide-react 图标组件，不适合放在纯数据常量文件里

// ==================== 安全查询辅助函数 ====================

/** 安全获取地点类型配置，无效类型回退到 other */
export function getPlaceTypeConfig(type: string) {
  return PLACE_TYPES[type as PlaceType] ?? PLACE_TYPES.other;
}

/** 安全获取支出分类配置，无效分类回退到 other */
export function getExpenseCategoryConfig(category: string) {
  return EXPENSE_CATEGORIES[category as ExpenseCategory] ?? EXPENSE_CATEGORIES.other;
}

/** 安全获取行程状态配置，无效状态回退到 planning */
export function getTripStatusConfig(status: string) {
  return TRIP_STATUS[status as TripStatus] ?? TRIP_STATUS.planning;
}

/** 安全获取打包分类配置，无效分类回退到 miscellaneous */
export function getPackingCategoryConfig(category: string) {
  return PACKING_CATEGORIES[category as PackingCategory] ?? PACKING_CATEGORIES.miscellaneous;
}
