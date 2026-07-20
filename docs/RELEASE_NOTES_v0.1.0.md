# Wanderlust v0.1.0 — 本地优先旅行规划器

## 首个公开版本

Wanderlust 是一个本地优先的旅行规划工具，帮你编排行程、管理预算、记录攻略。

## 核心功能

- **行程编排**：按天展示、拖拽排序、地点搜索（Nominatim）、类型选择
- **地图视图**：Leaflet + OpenStreetMap，OSRM 真实路线，高德/OSM 双源瓦片代理
- **预算管理**：多币种汇率换算、分类图表（Recharts）、债务分摊
- **攻略笔记**：Tiptap v3 富文本编辑器
- **打包清单**：AI 智能建议、分类筛选
- **账号系统**：Supabase Auth（可选）、云端同步、社区模板 fork
- **体验优化**：暗黑模式、响应式移动端、PWA、导出/导入

## 技术栈

Next.js 16 · React 19 · TypeScript · Tailwind v4 · Leaflet · dnd-kit · Recharts · Tiptap v3 · Zustand · Supabase

## 免费依赖

全部基于免费 API：OpenStreetMap（地图）、Nominatim（地理编码）、OSRM（路线）、open.er-api.com（汇率）

## 已知局限

- 社区功能（探索页 fork）需要配置 Supabase
- 地图瓦片在国内依赖高德代理，海外用户自动回退 OSM
- localStorage 存储容量 5-10MB，超量需导出备份或启用云同步
