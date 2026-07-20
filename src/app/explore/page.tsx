"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTripStore } from "@/stores/trip-store";
import { useAuth } from "@/contexts/AuthContext";
import { useHydrated } from "@/hooks/useHydrated";
import { supabase } from "@/lib/supabase";
import { daysBetween, formatDate } from "@/lib/utils";
import { getTripStatusConfig } from "@/lib/constants";
import { Badge, Button } from "@/components/ui";
import {
  Compass,
  Search,
  MapPin,
  Calendar,
  Globe,
  GitFork,
  Loader2,
  Users,
  PlayCircle,
  Sparkles,
  Wallet,
  Sun,
  TrendingUp,
} from "lucide-react";
import type { Trip } from "@/types";
import { getSeedTrips, getSeedPlaces, getSeedTemplate, getAllTags } from "@/lib/seed-templates";

interface CloudTripRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  destination: string;
  start_date: string;
  end_date: string;
  cover_image: string | null;
  status: Trip["status"];
  visibility: Trip["visibility"];
  base_currency: string;
  budget_limit: number | null;
  created_at: string;
  updated_at: string;
}

export default function ExplorePage() {
  const hydrated = useHydrated();
  const { configured, user } = useAuth();
  const router = useRouter();
  const { trips: localTrips, places, expenses, notes, addTrip, addPlace, addExpense, addNote } =
    useTripStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [cloudTrips, setCloudTrips] = useState<Trip[]>([]);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [forking, setForking] = useState<string | null>(null);
  const [forkedIds, setForkedIds] = useState<Set<string>>(new Set());

  // 从云端获取公开行程
  useEffect(() => {
    if (!configured || !supabase) return;
    setCloudLoading(true);
    supabase
      .from("trips")
      .select("*")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(24)
      .then(({ data, error }) => {
        if (error) {
          console.error("[Explore] 获取公开行程失败:", error.message);
        } else if (data) {
          const mapped: Trip[] = data.map((t: CloudTripRow) => ({
            id: t.id,
            userId: t.user_id,
            title: t.title,
            description: t.description ?? undefined,
            destination: t.destination,
            startDate: t.start_date,
            endDate: t.end_date,
            coverImage: t.cover_image ?? undefined,
            status: t.status,
            visibility: t.visibility,
            baseCurrency: t.base_currency,
            budgetLimit: t.budget_limit ?? undefined,
            createdAt: t.created_at,
            updatedAt: t.updated_at,
          }));
          setCloudTrips(mapped);
        }
        setCloudLoading(false);
      });
  }, [configured]);

  // 合并云端 + 本地公开行程 + 种子模板
  const allPublicTrips = useMemo(() => {
    const seedTrips = getSeedTrips();
    const localPublic = localTrips.filter((t) => t.visibility === "public");
    // 种子模板排在用户自己的行程后面
    const merged = [...localPublic, ...seedTrips];
    if (configured && cloudTrips.length > 0) {
      // 去重：已有行程不重复显示
      const existingIds = new Set(merged.map((t) => t.id));
      return [...merged, ...cloudTrips.filter((t) => !existingIds.has(t.id))];
    }
    return merged;
  }, [localTrips, cloudTrips, configured]);

  // 所有标签（仅种子模板）
  const allTags = useMemo(() => getAllTags(), []);

  // 搜索过滤 + 标签过滤
  const filteredTrips = useMemo(() => {
    let result = allPublicTrips;
    if (activeTag) {
      result = result.filter((t) => {
        if (t.userId !== "seed") return false;
        const tpl = getSeedTemplate(t.id);
        return tpl?.tags.includes(activeTag);
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.destination.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [allPublicTrips, searchQuery, activeTag]);

  // Fork 行程（深拷贝到本地）
  const handleFork = async (trip: Trip) => {
    setForking(trip.id);
    try {
      if (configured && supabase && user && trip.userId !== "seed") {
        // 云端 fork：调用 SQL 函数（种子模板不在云端，走本地 fork）
        const { data, error } = await supabase.rpc("fork_trip", {
          source_trip_id: trip.id,
        });
        if (error) throw error;
        // 成功后跳转到新行程（data 是新行程的 UUID）
        if (data) {
          setForkedIds((prev) => new Set(prev).add(trip.id));
          router.push(`/trip/${data}`);
        }
      } else {
        // 本地 fork：深拷贝行程及关联数据
        const newTrip = addTrip({
          userId: "local",
          title: `${trip.title}（副本）`,
          description: trip.description,
          destination: trip.destination,
          startDate: trip.startDate,
          endDate: trip.endDate,
          coverImage: trip.coverImage,
          status: "planning",
          visibility: "private",
          baseCurrency: trip.baseCurrency,
          budgetLimit: trip.budgetLimit,
        });

        // 拷贝地点（记录 ID 映射）
        // 种子模板从 SEED_TEMPLATES 获取，其他从 store 获取
        const isSeed = trip.userId === "seed";
        const tripPlaces = (isSeed
          ? getSeedPlaces(trip.id)
          : places.filter((p) => p.tripId === trip.id)
        ).sort((a, b) => a.dayIndex - b.dayIndex || a.order - b.order);
        const placeIdMap = new Map<string, string>();
        for (const place of tripPlaces) {
          const newPlace = addPlace({
            tripId: newTrip.id,
            dayIndex: place.dayIndex,
            name: place.name,
            address: place.address,
            lat: place.lat,
            lng: place.lng,
            type: place.type,
            stayMinutes: place.stayMinutes,
            order: place.order,
            notes: place.notes,
            rating: place.rating,
            imageUrl: place.imageUrl,
            websiteUrl: place.websiteUrl,
          });
          placeIdMap.set(place.id, newPlace.id);
        }

        // 拷贝支出
        const tripExpenses = expenses.filter((e) => e.tripId === trip.id);
        for (const expense of tripExpenses) {
          addExpense({
            tripId: newTrip.id,
            placeId: expense.placeId
              ? placeIdMap.get(expense.placeId) ?? undefined
              : undefined,
            category: expense.category,
            amount: expense.amount,
            currency: expense.currency,
            convertedAmount: expense.convertedAmount,
            date: expense.date,
            description: expense.description,
          });
        }

        // 拷贝笔记
        const tripNotes = notes.filter((n) => n.tripId === trip.id);
        for (const note of tripNotes) {
          addNote({
            tripId: newTrip.id,
            placeId: note.placeId
              ? placeIdMap.get(note.placeId) ?? undefined
              : undefined,
            title: note.title,
            content: note.content,
          });
        }

        setForkedIds((prev) => new Set(prev).add(trip.id));
        // 本地 fork 同样跳转到新行程
        router.push(`/trip/${newTrip.id}`);
      }
    } catch (err) {
      console.error("[Fork] 失败:", err);
    } finally {
      setForking(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* 标题 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">探索行程模板</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          浏览其他旅行者分享的行程模板，一键 fork 为自己的行程
        </p>
      </div>

      {/* 搜索栏 */}
      <div className="mb-4 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索目的地或关键词..."
            className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* 标签筛选栏 */}
      {allTags.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTag(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !activeTag
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            全部
          </button>
          {allTags.slice(0, 12).map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeTag === tag
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* 状态提示 */}
      {cloudLoading && (
        <div className="mb-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          正在加载公开行程...
        </div>
      )}

      {!configured && hydrated && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
          <p className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            当前展示本地公开行程。配置 Supabase 后可浏览社区中所有旅行者分享的行程。
          </p>
        </div>
      )}

      {/* 行程卡片网格 */}
      {hydrated && filteredTrips.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTrips.map((trip) => {
            const days = Math.max(0, daysBetween(trip.startDate, trip.endDate));
            const status = getTripStatusConfig(trip.status);
            const isForked = forkedIds.has(trip.id);
            const isForking = forking === trip.id;
            const isOwnTrip = trip.userId === "local";
            const isSeed = trip.userId === "seed";
            const seedTemplate = isSeed ? getSeedTemplate(trip.id) : undefined;

            return (
              <div
                key={trip.id}
                className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
              >
                {/* 封面渐变区（种子模板） */}
                {isSeed && seedTemplate ? (
                  <div
                    className="relative flex h-28 items-end p-4"
                    style={{ background: seedTemplate.coverGradient }}
                  >
                    <div className="absolute right-3 top-3 flex gap-1.5">
                      <Badge variant="info" className="bg-white/20 text-white backdrop-blur-sm">
                        <Sparkles className="mr-1 h-3 w-3" />
                        推荐模板
                      </Badge>
                    </div>
                    <div className="text-white">
                      <h3 className="text-lg font-bold leading-tight drop-shadow">{trip.title}</h3>
                      <p className="mt-0.5 text-xs text-white/90">
                        {trip.destination} · {days} 天 · {seedTemplate.difficulty}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 pb-2">
                    <Badge variant={status.variant}>
                      {status.label}
                    </Badge>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(trip.startDate, "short")}
                    </span>
                  </div>
                )}

                <div className="flex flex-1 flex-col p-4">
                {/* 标题（非种子模板） */}
                {!isSeed && (
                  <Link
                    href={`/trip/${trip.id}`}
                    className="mb-2 text-lg font-semibold transition-colors group-hover:text-primary"
                  >
                    {trip.title}
                  </Link>
                )}

                {/* 描述 */}
                {trip.description && (
                  <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                    {trip.description}
                  </p>
                )}

                {/* 种子模板：预算/季节/难度信息栏 */}
                {seedTemplate && (
                  <div className="mb-3 grid grid-cols-3 gap-2 rounded-lg bg-secondary/50 p-2 text-xs">
                    <div className="flex flex-col items-center gap-0.5">
                      <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">¥{seedTemplate.estimatedBudget}</span>
                      <span className="text-muted-foreground">人均</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <Sun className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium text-center">{seedTemplate.bestSeason}</span>
                      <span className="text-muted-foreground">最佳季节</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{seedTemplate.difficulty}</span>
                      <span className="text-muted-foreground">难度</span>
                    </div>
                  </div>
                )}

                {/* 种子模板：行程亮点 */}
                {seedTemplate && (
                  <div className="mb-3">
                    <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <Sparkles className="h-3 w-3" />
                      行程亮点
                    </p>
                    <ul className="space-y-1">
                      {seedTemplate.highlights.slice(0, 3).map((h, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-foreground/80">
                          <span className="mt-0.5 text-primary">·</span>
                          <span className="line-clamp-1">{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 种子模板：标签 */}
                {seedTemplate && (
                  <div className="mb-3 flex flex-wrap gap-1">
                    {seedTemplate.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* 视频参考链接（种子模板） */}
                {seedTemplate && (
                  <a
                    href={seedTemplate.sourceVideo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-3 flex items-center gap-1.5 text-xs text-blue-600 hover:underline dark:text-blue-400"
                  >
                    <PlayCircle className="h-3.5 w-3.5 shrink-0" />
                    <span className="line-clamp-1">{seedTemplate.sourceVideo.title}</span>
                  </a>
                )}

                {/* 元信息（非种子模板显示完整，种子模板已在封面显示） */}
                {!isSeed && (
                  <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {trip.destination}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {days} 天行程
                    </span>
                  </div>
                )}
                {isSeed && <div className="mb-4" />}

                {/* Fork 按钮 */}
                <div className="mt-auto">
                  {isOwnTrip ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      我的行程
                    </span>
                  ) : isForked ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-green-100 px-3 py-2 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
                      <GitFork className="h-3.5 w-3.5" />
                      已 Fork
                    </span>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={() => handleFork(trip)}
                      loading={isForking}
                      leftIcon={<GitFork className="h-3.5 w-3.5" />}
                    >
                      {isForking ? "Fork中..." : "Fork 行程"}
                    </Button>
                  )}
                </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        hydrated &&
        !cloudLoading && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
            <Compass className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">
              {searchQuery ? "没有找到匹配的行程" : "暂无公开行程"}
            </h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {searchQuery
                ? "试试其他关键词，或清除搜索条件"
                : "将你的行程设为公开，与社区分享你的旅行经验"}
            </p>
            {searchQuery && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setSearchQuery("")}
              >
                清除搜索
              </Button>
            )}
          </div>
        )
      )}
    </div>
  );
}
