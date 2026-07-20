import Link from "next/link";
import {
  Plane,
  MapPin,
  Wallet,
  NotebookPen,
  Globe,
  Sparkles,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: MapPin,
    title: "日程编排",
    desc: "拖拽式排序景点、餐厅、住宿，按天安排行程，一目了然。",
  },
  {
    icon: Globe,
    title: "地图路线",
    desc: "地图上标记所有地点，自动连线展示每日路线，支持国内外。",
  },
  {
    icon: Wallet,
    title: "预算管理",
    desc: "分类记账，多币种实时汇率换算，预算超支自动提醒。",
  },
  {
    icon: NotebookPen,
    title: "攻略笔记",
    desc: "每个地点附富文本笔记，记录攻略、图片、评分和链接。",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-blue-50 to-background dark:from-blue-950/20" />
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              本地优先 · 免费 · 支持国内外旅行
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              规划你的下一次旅行
              <span className="block text-primary">让每段旅程井井有条</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Wanderlust
              是一个本地优先的旅行规划工具，帮你编排行程、管理预算、记录攻略。
              数据存在浏览器本地，无需注册即可使用。
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                开始规划
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 font-medium transition-colors hover:bg-secondary"
              >
                探索行程模板
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold">核心功能</h2>
          <p className="mt-4 text-muted-foreground">
            从行程编排到预算管理，一站式解决旅行规划痛点
          </p>
        </div>
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
              >
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-secondary/50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-4">
              <Plane className="h-10 w-10 text-primary" />
              <div>
                <h3 className="text-xl font-bold">准备好出发了吗？</h3>
                <p className="text-sm text-muted-foreground">
                  创建你的第一个行程，开始规划完美旅程。
                </p>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              免费开始
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
