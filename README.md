# Wanderlust · 漫游规划器

一个本地优先的旅行规划工具，帮你编排行程、管理预算、记录攻略。支持国内外旅行，地图路线、多币种预算、攻略笔记一应俱全。

## 技术栈

| 技术 | 用途 |
|------|------|
| Next.js 16 (App Router) | 全栈框架 |
| React 19 + TypeScript | UI + 类型安全 |
| Tailwind CSS v4 | 原子化样式 |
| Leaflet + React-Leaflet | 地图（基于 OpenStreetMap，免费） |
| dnd-kit | 拖拽排序（日程编排） |
| Recharts | 数据可视化（预算图表） |
| Tiptap v3 | 富文本编辑器（攻略笔记） |
| Zustand + persist | 状态管理 + 本地持久化 |
| Supabase | 后端服务（Auth + 数据库，可选） |
| date-fns | 日期处理 |
| lucide-react | 图标库 |

## 架构设计

### 本地优先 + 云端可选

```
┌─────────────────────────────────────────────────┐
│                  浏览器（客户端）                   │
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐ │
│  │  Zustand  │  │  Context  │  │    API Routes   │ │
│  │  Store    │  │  Auth/    │  │  /api/search    │ │
│  │  (持久化) │  │  Theme   │  │  /api/route     │ │
│  ├──────────┤  ├──────────┤  │  /api/tile      │ │
│  │ 5 slices │  │ Supabase │  │  /api/transit   │ │
│  └──────────┘  └──────────┘  └────────┬───────┘ │
│                                       │         │
└───────────────────────────────────────┼─────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                    │
               ┌────▼────┐    ┌─────────▼────────┐  ┌───────▼──────┐
               │ Supabase │    │   OSRM / 高德    │  │  Nominatim   │
               │ Auth + DB│    │   路线/瓦片/交通   │  │  地理编码    │
               └─────────┘    └──────────────────┘  └──────────────┘
```

- **离线可用**：所有核心功能（行程/日程/预算/笔记/打包）完全在浏览器本地运行
- **按需同步**：登录 Supabase 后，数据可从云端同步至多设备
- **服务端代理**：地图瓦片、路线规划等请求通过 Next.js API Routes 代理，避免 CORS/ORB 限制

### 状态管理层

Store 采用 **slice 模式**，每个领域独立维护 CRUD 逻辑：

| Store 切片 | 职责 | 关键方法 |
|-----------|------|---------|
| `trip-slice` | 行程元数据（名称/目的地/日期/状态） | `addTrip`, `updateTrip`, `removeTrip` |
| `place-slice` | 地点 CRUD + 拖拽排序 | `addPlace`, `movePlace`, `removePlace` |
| `expense-slice` | 支出记录 + 分类统计 | `addExpense`, `settleDebts`, `getCategoryTotals` |
| `note-slice` | 攻略笔记 | `addNote`, `updateNote`, `removeNote` |
| `packing-slice` | 打包清单 + AI 建议 | `toggleItem`, `suggestItems` |

根 store 通过 Zustand `persist` 中间件自动保存到 `localStorage`，页面刷新不丢失。

## 环境要求

| 工具 | 最低版本 | 检查命令 |
|------|---------|---------|
| Node.js | 18.18.0+ | `node --version` |
| npm | 9.0+ | `npm --version` |

支持操作系统：Windows 10/11、macOS 12+、Ubuntu 20.04+。

> Windows 用户可使用 PowerShell 或 Git Bash 运行下文命令。CMD 用户请将 `cp` 替换为 `copy`。

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量（可选，不配置也可使用本地功能）
# macOS / Linux：
cp .env.local.example .env.local
# Windows (PowerShell)：
copy .env.local.example .env.local
# 编辑 .env.local 填入 Supabase 凭据

# 3. 启动开发服务器
npm run dev

# 4. 打开浏览器访问
# http://localhost:3000
```

## 项目结构

```
src/
├── app/                            # Next.js App Router
│   ├── layout.tsx                  # 根布局（含导航栏 + AuthProvider）
│   ├── page.tsx                    # 首页（落地页）
│   ├── globals.css                 # 全局样式 + 主题变量
│   ├── auth/
│   │   ├── login/page.tsx          # 登录页
│   │   └── register/page.tsx       # 注册页
│   ├── profile/
│   │   └── page.tsx                # 用户主页（资料 + 统计 + 同步 + 行程列表）
│   ├── dashboard/
│   │   └── page.tsx                # 行程列表页
│   ├── explore/
│   │   └── page.tsx                # 探索页（社区模板 + 搜索 + fork）
│   └── trip/[tripId]/
│       ├── layout.tsx              # 行程详情布局（含标签页导航 + active 高亮）
│       ├── page.tsx                # 行程概览
│       ├── itinerary/
│       │   └── page.tsx            # 日程编排（拖拽排序 + 路线规划 + 距离/时间）
│       ├── map/
│       │   └── page.tsx            # 地图视图（OSRM 真实路线）
│       ├── budget/
│       │   └── page.tsx            # 预算管理（多币种汇率换算 + 图表可视化）
│       └── notes/
│           └── page.tsx            # 攻略笔记（富文本编辑器）
├── components/
│   ├── layout/
│   │   └── Navbar.tsx              # 顶部导航栏（认证感知）
│   ├── itinerary/
│   │   ├── SortablePlaceItem.tsx   # 可拖拽地点项
│   │   ├── PlaceFormModal.tsx      # 地点新建/编辑弹窗（含搜索）
│   │   └── PlaceSearch.tsx         # 地点搜索组件（自动补全 + AbortController）
│   ├── budget/
│   │   └── BudgetCharts.tsx        # 预算图表（饼图 + 柱状图）
│   ├── notes/
│   │   └── RichTextEditor.tsx      # Tiptap 富文本编辑器
│   └── map/
│       └── MapView.tsx             # Leaflet 地图组件（支持真实路线几何）
├── contexts/
│   ├── AuthContext.tsx             # 认证上下文（登录/注册/登出/资料更新）
│   └── ThemeContext.tsx            # 主题上下文（暗黑/亮色切换 + localStorage 持久化）
├── hooks/
│   ├── useDayRoutes.ts             # 每日路线规划 hook（OSRM）
│   ├── useAllDayRoutes.ts          # 全天路线规划 hook（地图页用）
│   ├── useHydrated.ts              # SSR 水合守卫（Zustand persist）
│   └── useCloudSync.ts             # 云端同步 hook（登录自动拉取 + 手动同步）
├── lib/
│   ├── utils.ts                    # 工具函数（cn、日期、货币格式化等）
│   ├── constants.ts                # 常量定义（分类配置、货币列表等）
│   ├── currency.ts                 # 汇率换算服务（open.er-api.com + 缓存）
│   ├── geocode.ts                  # 地理编码服务（Nominatim + 限频 + AbortSignal）
│   ├── routing.ts                  # 路线规划服务（OSRM API + 距离/时间格式化）
│   ├── sync.ts                     # 云端同步服务（push/pull/全量同步/云端删除）
│   ├── export.ts                   # 行程导出/导入服务（JSON 备份 + 恢复）
│   └── supabase.ts                 # Supabase 客户端（含优雅降级）
├── stores/
│   ├── trip-store.ts               # Zustand 根 store（组合各领域 slice）
│   ├── trip-store.types.ts         # 跨 slice 的公开状态类型
│   ├── trip-store.utils.ts         # 安全持久化与更新时间工具
│   └── slices/                     # 行程、地点、支出、笔记、打包清单各自的 CRUD
└── types/
    └── index.ts                    # TypeScript 类型定义（含 cloudId 同步字段）
supabase/
└── schema.sql                      # 数据库 Schema（RLS + 触发器 + fork 函数）
```

## 页面功能一览

| 页面 | 路由 | 核心功能 |
|------|------|---------|
| 落地页 | `/` | Hero + 功能介绍 + 快速入口 |
| 首页/行程列表 | `/dashboard` | 搜索/筛选/排序行程，新建、导入 |
| 行程概览 | `/trip/[id]` | 统计数据、天气预报、快速入口 |
| 日程编排 | `/trip/[id]/itinerary` | 按天展示、拖拽排序、地点搜索、类型选择 |
| 地图视图 | `/trip/[id]/map` | Leaflet 地图、标记、OSRM 真实路线 |
| 预算管理 | `/trip/[id]/budget` | 支出 CRUD、分类图表、多币种换算、债务分摊 |
| 攻略笔记 | `/trip/[id]/notes` | Tiptap 富文本编辑器 |
| 打包清单 | `/trip/[id]/packing` | 清单 CRUD、AI 建议、分类筛选 |
| 用户主页 | `/profile` | 资料编辑、行程统计、云端同步 |
| 探索广场 | `/explore` | 社区模板搜索、fork |
| 登录/注册 | `/auth/login`, `/auth/register` | Supabase 邮箱认证 |
| 分享页 | `/share/[data]` | 静态分享（SSR 友好） |

## 内部 API 路由

项目通过 Next.js API Routes 代理外部服务，避免跨域和客户端限制：

### `GET /api/search`
地理编码搜索（Nominatim 代理）。
**参数**：`?q=东京塔&limit=5`
**返回**：地点列表（名称、坐标、类型、地址）

### `GET /api/route`
路线规划（OSRM 代理）。
**参数**：`?waypoints=lng1,lat1;lng2,lat2&mode=driving`
**返回**：路线几何、距离、预计时长

### `GET /api/tile/{z}/{x}/{y}?source=amap|osm`
地图瓦片代理（绕过 ORB/CORS 限制）。
- `source=amap`（默认）：高德瓦片，国内加载快
- `source=osm`：OpenStreetMap 瓦片，全球可用
- 高德失败自动回退 OSM，双重失败返回透明 PNG
- 实例内缓存：5 分钟 TTL、200 条目、16 MB 字节上限

### `GET /api/transit`
公共交通查询（Overpass API 代理）。
**参数**：`?north=...&south=...&east=...&west=...&bbox=...`
**返回**：公交/地铁/有轨电车线路与站点

## 已实现功能

### 已完成（骨架）

- [x] 落地页（Hero + 功能介绍）
- [x] 行程列表 + 新建行程
- [x] 行程详情布局（标签页导航）
- [x] 行程概览页（统计数据 + 快速入口）
- [x] 日程编排页（按天展示 + 地点 CRUD + **拖拽排序** + 类型选择 + 编辑）
- [x] 地图视图页（Leaflet 地图 + 标记 + 路线连线）
- [x] 预算管理页（支出 CRUD + 分类统计 + 预算追踪 + **多币种汇率换算**）
- [x] 攻略笔记页（笔记 CRUD）
- [x] 本地数据持久化（Zustand persist + localStorage）

### 第二阶段 — 完善核心功能

- [x] 地点搜索与地理编码（Nominatim API + 自动补全 + 智能类型推断）
- [x] 路线规划与距离计算（OSRM API + 每日路线徽章 + 总距离/时间统计）
- [x] 预算图表可视化（Recharts 饼图分类占比 + 柱状图每日趋势）
- [x] 富文本笔记编辑器（Tiptap v3 + 完整工具栏：加粗/斜体/下划线/标题/列表/引用/链接等）
- [x] SSR 水合修复（Zustand persist + useHydrated 守卫，解决整页刷新"行程不存在"问题）

### 第三阶段 — 账号与社区

- [x] Supabase Auth 登录注册（邮箱/密码，含优雅降级）
- [x] 云端数据同步（本地优先 + 按需推送/拉取，登录自动同步）
- [x] 行程模板广场（探索页，搜索 + 云端/本地公开行程合并展示）
- [x] 行程 fork 功能（本地深拷贝 + 云端 SQL 函数两种模式）
- [x] 用户主页（资料编辑 + 行程统计 + 同步状态 + 云端同步按钮）
- [x] 数据库 Schema（RLS 行级安全 + 自动 profile 触发器 + fork 函数）
- [x] 认证感知导航栏（登录/注册按钮 + 头像下拉菜单）

**第四阶段 — 体验优化**

- [x] 暗黑模式切换（ThemeProvider + 系统偏好检测 + 防闪烁 inline 脚本）
- [x] 响应式移动端适配（Navbar 汉堡菜单 + 表单/卡片断点优化）
- [x] 搜索与筛选（Dashboard 按标题/目的地搜索 + 状态筛选 + 多维排序）
- [x] 行程导出/导入（JSON 备份 + 一键恢复，含子数据完整导出）

## API 说明（全部免费）

| 功能 | API | 免费额度 | 文档 |
|------|-----|---------|------|
| 地图底图 | OpenStreetMap | 无限 | https://wiki.openstreetmap.org |
| 地理编码 | Nominatim | 1 次/秒 | https://nominatim.org/release-docs/latest |
| 路线规划 | OSRM | 无限 | http://project-osrm.org |
| 汇率换算 | open.er-api.com（原生 fetch） | 1500 次/月 | https://www.exchangerate-api.com/docs/free-api |
| 景点图片 | Unsplash | 50 次/小时 | https://unsplash.com/developers |

## 切换到 Google Maps（可选）

当前使用 Leaflet + OpenStreetMap（完全免费）。如需切换到 Google Maps（数据更全、支持街景、Places 搜索），只需替换 `src/components/map/MapView.tsx` 一个文件：

```bash
# 1. 安装 Google Maps React 官方库
npm install @vis.gl/react-google-maps

# 2. 配置环境变量
echo "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key" >> .env.local

# 3. 重写 MapView.tsx 内部实现（接口不变，其他页面无需改动）
```

Google Maps Platform 2025 年起按 SKU 提供每月免费额度（基础版每 SKU 1 万次/月），个人项目基本不会超。详见 https://mapsplatform.google.com/pricing/

## 开发计划

| 阶段 | 内容 | 状态 |
|------|------|------|
| 1 | 项目初始化 + 基础布局 | ✅ 已完成 |
| 2 | 日程拖拽 + 地图集成 + 地点搜索 | ✅ 已完成 |
| 3 | 预算图表 + 汇率换算 + 路线规划 | ✅ 已完成 |
| 4 | 富文本笔记编辑器 + SSR 修复 | ✅ 已完成 |
| 5 | Supabase 账号系统 + 认证感知导航 | ✅ 已完成 |
| 6 | 云端同步 + 社区功能（模板广场 + fork） | ✅ 已完成 |
| 7 | UI 打磨 + 暗黑模式 + 响应式 + 搜索筛选 + 导出导入 | ✅ 已完成 |
| 8 | 部署上线（Vercel） | 待开发 |

## Supabase 配置（可选）

本项目采用**本地优先**架构，不配置 Supabase 也能完整使用所有本地功能。配置后可解锁账号系统、云端同步和社区功能。

```bash
# 1. 复制环境变量模板
cp .env.local.example .env.local

# 2. 在 .env.local 中填入 Supabase 凭据
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# 3. 在 Supabase Dashboard → SQL Editor 中执行数据库 Schema
#    复制 supabase/schema.sql 内容并运行

# 4. （可选）在 Supabase Dashboard → Authentication → Providers
#    关闭 "Confirm email" 以便测试时无需邮箱验证即可登录
```

### 云端同步机制

| 操作 | 行为 |
|------|------|
| 登录 | 自动拉取云端行程到本地（全量同步） |
| 手动同步 | 推送所有本地行程到云端 → 拉取云端行程到本地 |
| 删除行程 | 若有 cloudId 则同时从云端删除 |
| Fork 行程 | 云端模式调用 SQL 函数深拷贝；本地模式深拷贝到 Zustand |

同步采用 `cloudId` 字段映射本地与云端记录，2 秒时间容差避免推送后立即拉取的无意义覆盖。

## 部署

```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

推荐部署到 [Vercel](https://vercel.com)，自动 CI/CD，免费托管。

### 运行时保护

- 地图瓦片代理的实例内缓存同时受 5 分钟 TTL、200 条目、16 MB 总大小和单瓦片 512 KB 限制，避免 serverless 复用实例的内存持续增长。
- 登录后的资料请求使用 `AbortController`；页面卸载或认证订阅清理时会取消在途请求，避免过期响应更新 React 状态。
- GitHub Actions 会运行 lint、类型检查、单元测试、生产依赖审计与生产构建。

## 常见问题（FAQ）

### 控制台报错 `Unable to load preload script: ... preload-browserView.js`

这是 **TRAE 内置浏览器**的环境问题，不影响应用功能。TRAE 安装目录缺少 `browserView/common/preload-browserView.js` 文件，由 Electron 主进程报出，应用代码无法拦截。处理方式：

- **可忽略**：此错误不影响页面渲染和功能使用。
- **如想彻底消除**：重启 TRAE 即可（TRAE 重启时会重新校验安装目录）。
- **正式反馈**：建议通过 TRAE 官方渠道反馈此安装缺失问题。

### 控制台报错 `[getThemeColors] TypeError: Cannot destructure property 'exportedColors'`

这是 **Next.js DevTools** 的内部错误，与本应用无关。应用已通过 `console.error` 拦截器过滤，生产环境（`npm run build && npm start`）不会出现。

### 控制台出现 hydration mismatch 警告（`data-trae-ref`）

这是 **TRAE 浏览器扩展**给页面元素注入 `data-trae-ref` 属性所致，并非应用 bug。应用已通过 `MutationObserver` 在 React 水合前后主动清理这些属性。在普通 Chrome / Firefox / Safari 中打开本应用不会出现此警告。

### 地图瓦片加载不出来

本项目使用高德瓦片（国内快）+ OpenStreetMap 瓦片（全球可用）双源，服务端代理自动回退：

- 国内用户：默认走高德，正常情况下加载很快
- 海外用户：高德可能超时，自动回退到 OSM
- 若仍加载不出：检查网络代理设置，确保能访问 `webrd0X.is.autonavi.com` 或 `tile.openstreetmap.org`

### 存储空间提示「存储已满」

localStorage 实际容量因浏览器而异（5-10MB）。应用使用 `navigator.storage.estimate()` 动态获取真实配额，Safari 等不支持时回退到保守的 5MB 估算。建议：

- 定期导出备份旧行程（JSON 文件）
- 删除不再需要的行程
- 如需更大存储，配置 Supabase 后使用云端同步

## License

MIT
