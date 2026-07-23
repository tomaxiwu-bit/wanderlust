"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo, useRef, useEffect } from "react";
import { parseISO } from "date-fns";
import { useTripStore } from "@/stores/trip-store";
import { useHydrated } from "@/hooks/useHydrated";
import { deleteTripFromCloud } from "@/lib/sync";
import { exportTripToJSON, importTripFromJSON } from "@/lib/export";
import { toast, confirm, Modal, FormField, Button, Badge } from "@/components/ui";
import {
  Plus,
  MapPin,
  Calendar,
  Trash2,
  Plane,
  Loader2,
  Search,
  Download,
  Filter,
  X,
  Upload,
  Sparkles,
  HardDrive,
  AlertTriangle,
} from "lucide-react";
import { formatDate, daysBetween } from "@/lib/utils";
import { getTripStatusConfig } from "@/lib/constants";
import { getStorageUsage, getStorageUsageAsync, formatBytes } from "@/lib/storage-monitor";
import { TemplateRecommendModal } from "@/components/trip/TemplateRecommendModal";
import type { TripStatus } from "@/types";

type SortBy = "updated" | "start" | "days";

export default function DashboardPage() {
  const { trips, addTrip, deleteTrip } = useTripStore();
  const hydrated = useHydrated();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showTemplateRecommend, setShowTemplateRecommend] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TripStatus | "all">("all");
  const [sortBy, setSortBy] = useState<SortBy>("updated");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // 存储用量监控（内联实现，避免独立组件文件的 SWC 编译问题）
  // 初始用同步版本（保守 5MB 上限），挂载后用异步版本获取真实配额
  const [storageUsage, setStorageUsage] = useState(() => getStorageUsage());
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    // 异步刷新：使用 navigator.storage.estimate() 获取真实配额
    const updateUsage = async () => setStorageUsage(await getStorageUsageAsync());
    updateUsage();
    window.addEventListener("focus", updateUsage);
    return () => window.removeEventListener("focus", updateUsage);
  }, []);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const newTripId = await importTripFromJSON(file);
      toast.success("行程导入成功");
      router.push(`/trip/${newTripId}`);
    } catch (err) {
      toast.error(
        "导入失败",
        err instanceof Error ? err.message : String(err)
      );
    }
    // 重置 input，允许再次选择同一文件
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 搜索 + 筛选 + 排序
  const filteredTrips = useMemo(() => {
    let result = [...trips];

    // 搜索：标题 + 目的地
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.destination.toLowerCase().includes(q)
      );
    }

    // 状态筛选
    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }

    // 排序
    result.sort((a, b) => {
      if (sortBy === "updated") {
        return parseISO(b.updatedAt).getTime() - parseISO(a.updatedAt).getTime();
      }
      if (sortBy === "start") {
        return parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime();
      }
      if (sortBy === "days") {
        return daysBetween(b.startDate, b.endDate) - daysBetween(a.startDate, a.endDate);
      }
      return 0;
    });

    return result;
  }, [trips, searchQuery, statusFilter, sortBy]);

  // Wait for Zustand persist to hydrate from localStorage
  if (!hydrated) {
    return (
      <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-20 sm:px-6 lg:px-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasFilters = searchQuery.trim() || statusFilter !== "all";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* 头部 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">我的行程</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理你的旅行计划，共 {trips.length} 个行程
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* 导入行程 */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          <Button
            variant="outline"
            leftIcon={<Upload className="h-4 w-4" />}
            onClick={() => fileInputRef.current?.click()}
            title="从 JSON 备份导入行程"
          >
            <span className="hidden sm:inline">导入</span>
          </Button>
          <Button
            variant="outline"
            leftIcon={<Sparkles className="h-4 w-4 text-primary" />}
            onClick={() => setShowTemplateRecommend(true)}
            className="border-primary/30 hover:bg-primary/5"
          >
            <span className="hidden sm:inline">模板推荐</span>
          </Button>
          <Button
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowCreateForm(true)}
          >
            <span className="hidden sm:inline">新建行程</span>
          </Button>
        </div>
      </div>

      {/* 存储用量指示器（接近上限时显示） */}
      {mounted && storageUsage.percent >= 60 && (() => {
        const sColor =
          storageUsage.percent >= 100
            ? "#ef4444"
            : storageUsage.percent >= 80
            ? "#f59e0b"
            : "#3b82f6";
        const sMessage =
          storageUsage.percent >= 100
            ? "存储已满，新数据无法保存！请导出备份后删除旧行程"
            : storageUsage.percent >= 80
            ? "存储空间即将用完，建议导出备份并清理不需要的行程"
            : "存储用量较高，注意管理行程数据";
        return (
          <div
            className="mb-4 rounded-lg border p-3"
            style={{ borderColor: `${sColor}40`, backgroundColor: `${sColor}10` }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                {storageUsage.percent >= 80 ? (
                  <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: sColor }} />
                ) : (
                  <HardDrive className="h-4 w-4 shrink-0" style={{ color: sColor }} />
                )}
                <span style={{ color: sColor }}>{sMessage}</span>
              </div>
              <span className="shrink-0 text-xs font-medium" style={{ color: sColor }}>
                {formatBytes(storageUsage.usedBytes)} / {formatBytes(storageUsage.limitBytes)}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(storageUsage.percent, 100)}%`,
                  backgroundColor: sColor,
                }}
              />
            </div>
          </div>
        );
      })()}

      {/* 搜索 + 筛选栏 */}
      {trips.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* 搜索框 */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索行程标题或目的地..."
              className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-9 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* 状态筛选 */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TripStatus | "all")}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">全部状态</option>
              <option value="planning">规划中</option>
              <option value="ongoing">进行中</option>
              <option value="completed">已完成</option>
              <option value="archived">已归档</option>
            </select>
          </div>

          {/* 排序 */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="updated">最近更新</option>
            <option value="start">开始日期</option>
            <option value="days">行程天数</option>
          </select>
        </div>
      )}

      {/* 行程列表 */}
      {trips.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
          <Plane className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-medium">还没有行程</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            点击右上角 &quot;新建行程&quot;，开始规划你的第一次旅行吧！
          </p>
        </div>
      ) : filteredTrips.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
          <Search className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-medium">没有匹配的行程</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            试试调整搜索关键词或筛选条件
          </p>
          {hasFilters && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
            >
              清除筛选
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTrips.map((trip) => {
            const status = getTripStatusConfig(trip.status);
            const days = daysBetween(trip.startDate, trip.endDate);
            return (
              <div
                key={trip.id}
                className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <Link href={`/trip/${trip.id}`} className="block">
                  <div className="mb-3 flex items-center justify-between">
                    <Badge variant={status.variant}>
                      {status.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {days} 天
                    </span>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold group-hover:text-primary">{trip.title}</h3>
                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      {trip.destination}
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(trip.startDate, "short")} -{" "}
                      {formatDate(trip.endDate, "short")}
                    </div>
                  </div>
                </Link>

                {/* 操作按钮组 */}
                <div className="absolute right-3 top-3 flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                  <button
                    onClick={() => exportTripToJSON(trip.id)}
                    className="rounded p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    aria-label="导出行程"
                    title="导出 JSON"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={async () => {
                      const ok = await confirm({
                        title: `删除行程"${trip.title}"？`,
                        description:
                          "该行程的所有地点、支出和笔记将被永久删除，此操作不可撤销。",
                        confirmText: "删除",
                        variant: "danger",
                      });
                      if (!ok) return;
                      if (trip.cloudId) {
                        try {
                          await deleteTripFromCloud(trip.cloudId);
                        } catch (err) {
                          console.error("[删除] 云端删除失败:", err);
                          toast.error("云端删除失败", "本地行程仍会删除");
                        }
                      }
                      deleteTrip(trip.id);
                      toast.success("行程已删除");
                    }}
                    className="rounded p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label="删除行程"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 模板推荐弹窗 */}
      <TemplateRecommendModal
        open={showTemplateRecommend}
        onClose={() => setShowTemplateRecommend(false)}
      />

      {/* 新建行程弹窗 */}
      {showCreateForm && (
        <CreateTripModal
          onClose={() => setShowCreateForm(false)}
          onCreate={(data) => {
            addTrip({
              ...data,
              userId: "local",
              status: "planning",
              visibility: "private",
              baseCurrency: "CNY",
            });
            setShowCreateForm(false);
          }}
        />
      )}
    </div>
  );
}

/** 新建行程弹窗 */
function CreateTripModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: {
    title: string;
    destination: string;
    startDate: string;
    endDate: string;
    description?: string;
  }) => void;
}) {
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [dateError, setDateError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !destination || !startDate || !endDate) return;
    if (endDate < startDate) {
      setDateError("结束日期不能早于开始日期");
      return;
    }
    setDateError("");
    onCreate({ title, destination, startDate, endDate, description });
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="新建行程"
      size="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>取消</Button>
          <Button variant="primary" size="sm" type="submit" form="create-trip-form">创建</Button>
        </>
      }
    >
      <form id="create-trip-form" onSubmit={handleSubmit} className="space-y-4">
        <FormField label="行程标题" required>
          {({ id, ariaDescribedBy }) => (
            <input
              id={id}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：东京 5 日游"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              aria-describedby={ariaDescribedBy}
              required
            />
          )}
        </FormField>
        <FormField label="目的地" required>
          {({ id, ariaDescribedBy }) => (
            <input
              id={id}
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="例如：东京"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              aria-describedby={ariaDescribedBy}
              required
            />
          )}
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="开始日期" required>
            {({ id, ariaDescribedBy }) => (
              <input
                id={id}
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDateError("");
                }}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                aria-describedby={ariaDescribedBy}
                required
              />
            )}
          </FormField>
          <FormField label="结束日期" required error={dateError || undefined}>
            {({ id, ariaDescribedBy }) => (
              <input
                id={id}
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDateError("");
                }}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                aria-describedby={ariaDescribedBy}
                required
              />
            )}
          </FormField>
        </div>
        <FormField label="备注">
          {({ id, ariaDescribedBy }) => (
            <textarea
              id={id}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="行程简介（可选）"
              rows={2}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              aria-describedby={ariaDescribedBy}
            />
          )}
        </FormField>
      </form>
    </Modal>
  );
}
