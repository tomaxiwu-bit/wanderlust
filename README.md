# Wanderlust · 漫游规划器

把一次旅行的 **每日行程、地点地图、预算、攻略笔记和打包清单** 放在一起。数据默认保存在当前浏览器，不登录也能规划；需要多设备同步时，可选接入 Supabase。

*A local-first travel planner for itineraries, maps, budgets and notes.*

**[快速试用](#快速试用)** · [走通一个行程](#走通一个行程) · [开发与配置](docs/DEVELOPMENT.md) · [版本记录](docs/RELEASE_NOTES_v0.1.0.md)

[![CI](https://github.com/tomaxiwu-bit/wanderlust/actions/workflows/ci.yml/badge.svg)](https://github.com/tomaxiwu-bit/wanderlust/actions/workflows/ci.yml)

![Wanderlust 旅行规划器首页](docs/images/home.png)

## 一次旅行怎么安排

| 需要做什么 | 在哪里完成 | 保存或得到什么 |
|---|---|---|
| 把想去的地点排进每天 | 日程编排与拖拽排序 | 按天组织的地点与顺序 |
| 查看地点分布和道路路线 | 地图、地点搜索与路线规划 | 距离、预计用时和地图视图 |
| 记账并查看花费结构 | 多币种支出与分类图表 | 每日趋势、分类占比与分摊记录 |
| 收好攻略与出发准备 | 富文本笔记和规则化打包建议 | 攻略内容与可勾选清单 |
| 备份或迁移计划 | JSON 导出 / 导入 | 包含行程及关联内容的备份文件 |

行程与打包建议来自规则和模板，使用者可以继续调整。地图搜索、瓦片、路线和实时汇率等在线信息需要网络；本地记录与在线服务的可用性分别处理。

## 快速试用

需要 **Node.js ≥20.9、npm 和 Git**。在 PowerShell 中执行：

```powershell
git clone https://github.com/tomaxiwu-bit/wanderlust.git
Set-Location wanderlust
npm ci
npm run dev
```

打开 <http://localhost:3000>，进入行程列表并创建行程。首次试用可以先不配置 `.env.local`；本地功能不需要 Supabase 账号。当前仓库没有附带已上线的在线演示地址。

## 走通一个行程

1. 新建一个“东京 5 日游”，填写日期与预算。
2. 在日程页添加想去的地点，拖拽调整顺序，再到地图查看分布与路线。
3. 录入几笔不同分类的示例支出，检查预算图表和币种。
4. 写一条攻略笔记，检查打包清单，按实际需要修改建议。
5. 导出 JSON，再通过导入检查备份是否包含预期内容。

这条路径使用你自己新建的示例计划。完整演示操作见 [DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md)；其中的示例行程不代表已经为真实旅行核验了营业时间、交通或费用。

## 数据保存在什么地方

未配置云服务时，行程、支出、笔记和清单保存在当前浏览器的 `localStorage`。刷新页面可继续使用；清理站点数据、更换浏览器或设备时，不会自动带走这些记录，建议定期导出 JSON 备份。

Supabase 是可选同步层。需要账号、云端同步和社区功能时，按 [开发与配置](docs/DEVELOPMENT.md) 设置环境变量并执行数据库 schema。地图等服务仍会接收运行相应功能所需的查询与坐标。

## 在线服务的范围

项目使用 Nominatim、OSRM、地图瓦片和汇率等外部服务。公共服务有使用限制和可用性边界，不能将开源软件理解为无限制的公共 API 配额。规模化部署需要按各服务政策配置用量、缓存或自托管方案。

[OSM 瓦片使用政策](https://operations.osmfoundation.org/policies/tiles/) · [Nominatim 政策](https://operations.osmfoundation.org/policies/nominatim/) · [OSRM 演示服务限制](https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server)

## 开发与反馈

技术栈为 Next.js 16、React 19、TypeScript 与 Zustand，地图使用 Leaflet，笔记使用 Tiptap。API 路由、目录结构、Supabase 配置与部署说明见 [开发参考](docs/DEVELOPMENT.md)。

```powershell
npm run check
npm run build
```

CI 执行 lint、类型检查、单元测试、生产构建与依赖审计。测试覆盖状态管理、导入导出、分享、结算和 API 输入边界；地图数据和行程安排仍需使用者自行核对。

反馈请提交 [Issue](https://github.com/tomaxiwu-bit/wanderlust/issues)，附页面、复现步骤和浏览器版本。代码采用 [MIT](LICENSE)。
