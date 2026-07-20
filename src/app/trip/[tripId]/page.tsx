"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTripStore } from "@/stores/trip-store";
import { exportTripToJSON } from "@/lib/export";
import { generateShareUrl, checkShareSize } from "@/lib/share";
import { Button, Modal } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { FeasibilityPanel } from "@/components/trip/FeasibilityPanel";
import {
  Calendar,
  Globe,
  Wallet,
  NotebookPen,
  Backpack,
  ArrowRight,
  Download,
  Share2,
  Copy,
  AlertTriangle,
} from "lucide-react";

const quickLinks = [
  {
    href: "itinerary",
    label: "日程编排",
    desc: "按天安排景点、餐厅、住宿",
    icon: Calendar,
  },
  {
    href: "map",
    label: "地图视图",
    desc: "查看所有地点和路线",
    icon: Globe,
  },
  {
    href: "budget",
    label: "预算管理",
    desc: "记录花费，管理预算",
    icon: Wallet,
  },
  {
    href: "notes",
    label: "攻略笔记",
    desc: "记录旅行攻略和心得",
    icon: NotebookPen,
  },
  {
    href: "packing",
    label: "打包清单",
    desc: "智能推荐，按分类管理物品",
    icon: Backpack,
  },
];

export default function TripOverviewPage() {
  const params = useParams<{ tripId: string }>();
  const trip = useTripStore((s) => s.trips.find((t) => t.id === params.tripId));
  const allPlaces = useTripStore((s) => s.places);
  const allExpenses = useTripStore((s) => s.expenses);
  const allNotes = useTripStore((s) => s.notes);
  const [showShare, setShowShare] = useState(false);
  const places = useMemo(
    () =>
      allPlaces
        .filter((p) => p.tripId === params.tripId)
        .sort((a, b) => a.dayIndex - b.dayIndex || a.order - b.order),
    [allPlaces, params.tripId]
  );
  const expenses = useMemo(
    () => allExpenses.filter((e) => e.tripId === params.tripId),
    [allExpenses, params.tripId]
  );
  const notes = useMemo(
    () => allNotes.filter((n) => n.tripId === params.tripId),
    [allNotes, params.tripId]
  );

  if (!trip) return null;

  return (
    <div className="space-y-6">
      {/* 数据统计 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="地点数" value={places.length} />
        <StatCard
          label="已记录花费"
          value={`${expenses.reduce((sum, e) => sum + (e.convertedAmount ?? e.amount), 0).toFixed(0)} ${trip.baseCurrency}`}
        />
        <StatCard label="笔记数" value={notes.length} />
        <StatCard
          label="预算上限"
          value={trip.budgetLimit ? `${trip.budgetLimit} ${trip.baseCurrency}` : "未设置"}
        />
      </div>

      {/* 行程可行性分析（学习 Rutugo + Sygic） */}
      <FeasibilityPanel trip={trip} places={places} />

      {/* 快速入口 */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">快速入口</h2>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Share2 className="h-4 w-4" />}
            onClick={() => setShowShare(true)}
            title="生成只读分享链接"
          >
            <span className="hidden sm:inline">分享</span>
          </Button>
          <Button
            variant="outline"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={() => exportTripToJSON(trip.id)}
            title="导出此行程为 JSON 备份"
          >
            <span className="hidden sm:inline">导出行程</span>
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={`/trip/${trip.id}/${link.href}`}
                className="group flex items-center justify-between rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{link.label}</h3>
                    <p className="text-sm text-muted-foreground">{link.desc}</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* 分享弹窗 */}
      {showShare && (
        <ShareModal
          trip={trip}
          places={places}
          expenses={expenses}
          notes={notes}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

/** 分享弹窗 */
function ShareModal({
  trip,
  places,
  expenses,
  notes,
  onClose,
}: {
  trip: import("@/types").Trip;
  places: import("@/types").Place[];
  expenses: import("@/types").Expense[];
  notes: import("@/types").Note[];
  onClose: () => void;
}) {
  const shareData = useMemo(
    () => ({ trip, places, expenses, notes }),
    [trip, places, expenses, notes]
  );
  const sizeCheck = useMemo(() => checkShareSize(shareData), [shareData]);
  const shareUrl = useMemo(() => generateShareUrl(shareData), [shareData]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("链接已复制", "可直接粘贴发送给好友");
    } catch {
      toast.error("复制失败", "请手动选择链接复制");
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="分享行程"
      size="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>关闭</Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Copy className="h-4 w-4" />}
            onClick={handleCopy}
          >
            复制链接
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-lg bg-primary/5 p-3 text-sm">
          <Share2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p>生成只读分享链接，任何人通过链接可查看行程详情</p>
            <p className="mt-1 text-xs text-muted-foreground">
              无需登录，不含个人信息，仅包含行程内容
            </p>
          </div>
        </div>

        {!sizeCheck.safe && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <div>
              <p>行程数据较大（{sizeCheck.size} 字符），链接可能过长</p>
              <p className="mt-1 text-xs text-muted-foreground">
                建议使用「导出行程」生成 JSON 文件分享，或删减部分内容
              </p>
            </div>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            分享链接
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              onClick={(e) => e.currentTarget.select()}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
