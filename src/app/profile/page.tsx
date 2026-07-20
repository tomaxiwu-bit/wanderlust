"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useTripStore } from "@/stores/trip-store";
import { useHydrated } from "@/hooks/useHydrated";
import { useCloudSync } from "@/hooks/useCloudSync";
import { daysBetween } from "@/lib/utils";
import { getTripStatusConfig } from "@/lib/constants";
import { FormField, Badge, Button } from "@/components/ui";
import {
  MapPin,
  Calendar,
  Plane,
  Edit3,
  Save,
  Loader2,
  Settings,
  Globe,
  Lock,
  ChartBar,
  RefreshCw,
  Cloud,
  CloudOff,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { Trip } from "@/types";

export default function ProfilePage() {
  const { user, profile, configured, updateProfile } = useAuth();
  const hydrated = useHydrated();
  const { trips } = useTripStore();
  const cloudSync = useCloudSync();

  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(profile?.username ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [saving, setSaving] = useState(false);

  // 本地行程统计
  const stats = useMemo(() => {
    const total = trips.length;
    const publicTrips = trips.filter((t) => t.visibility === "public").length;
    const completed = trips.filter((t) => t.status === "completed").length;
    const totalDays = trips.reduce(
      (sum, t) => sum + Math.max(0, daysBetween(t.startDate, t.endDate)),
      0
    );
    return { total, publicTrips, completed, totalDays };
  }, [trips]);

  const handleSave = async () => {
    setSaving(true);
    const result = await updateProfile({ username, bio });
    setSaving(false);
    if (!result.error) {
      setEditing(false);
    }
  };

  // 未配置 Supabase
  if (!configured) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="flex items-start gap-3">
            <Settings className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <h2 className="font-semibold text-amber-800 dark:text-amber-200">
                Supabase 未配置
              </h2>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                账号功能不可用。配置 Supabase 后可启用用户资料、云端同步和社区功能。
              </p>
            </div>
          </div>
        </div>

        {/* 本地行程概览 */}
        {hydrated && (
          <ProfileStats stats={stats} />
        )}
        {hydrated && trips.length > 0 && (
          <TripList trips={trips} />
        )}
      </div>
    );
  }

  // 未登录
  if (!user) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
          <Plane className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold">尚未登录</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          登录后查看你的个人主页
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/auth/login"
            className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            登录
          </Link>
          <Link
            href="/auth/register"
            className="rounded-lg border border-border px-5 py-2 text-sm font-medium transition-colors hover:bg-secondary"
          >
            注册
          </Link>
        </div>
      </div>
    );
  }

  const initials = (profile?.username ?? user.email ?? "U").slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* 用户资料卡片 */}
      <div className="mb-8 rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          {/* 头像 */}
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
            {profile?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt={profile.username}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              initials
            )}
          </div>

          {/* 信息 */}
          <div className="flex-1">
            {editing ? (
              <div className="space-y-3">
                <FormField label="用户名">
                  {({ id }) => (
                    <input
                      id={id}
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                  )}
                </FormField>
                <FormField label="个人简介">
                  {({ id }) => (
                    <textarea
                      id={id}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={2}
                      placeholder="一句话介绍自己..."
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                  )}
                </FormField>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold">
                  {profile?.username ?? "用户"}
                </h1>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                {profile?.bio && (
                  <p className="mt-2 text-sm">{profile.bio}</p>
                )}
              </>
            )}
          </div>

          {/* 编辑/保存按钮 */}
          <div>
            {editing ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditing(false)}
                >
                  取消
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  loading={saving}
                  leftIcon={<Save className="h-4 w-4" />}
                >
                  保存
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                leftIcon={<Edit3 className="h-4 w-4" />}
                onClick={() => {
                  setUsername(profile?.username ?? "");
                  setBio(profile?.bio ?? "");
                  setEditing(true);
                }}
              >
                编辑资料
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 云端同步 */}
      {hydrated && (
        <SyncCard
          syncing={cloudSync.syncing}
          lastSync={cloudSync.lastSync}
          lastResult={cloudSync.lastResult}
          error={cloudSync.error}
          onSync={cloudSync.syncNow}
          totalTrips={trips.length}
          syncedTrips={trips.filter((t) => t.cloudId).length}
        />
      )}

      {/* 统计 */}
      {hydrated && <ProfileStats stats={stats} />}

      {/* 我的行程 */}
      {hydrated && trips.length > 0 && <TripList trips={trips} />}
    </div>
  );
}

/** 云端同步卡片 */
function SyncCard({
  syncing,
  lastSync,
  lastResult,
  error,
  onSync,
  totalTrips,
  syncedTrips,
}: {
  syncing: boolean;
  lastSync: Date | null;
  lastResult: { pushed: number; pulled: number; errors: string[] } | null;
  error: string | null;
  onSync: () => Promise<unknown>;
  totalTrips: number;
  syncedTrips: number;
}) {
  const lastSyncText = lastSync
    ? new Intl.DateTimeFormat("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(lastSync)
    : "从未";

  return (
    <div className="mb-8 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* 左侧：状态信息 */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
            {syncing ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : error ? (
              <AlertCircle className="h-5 w-5 text-destructive" />
            ) : lastResult ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <Cloud className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium">
              {syncing
                ? "正在同步..."
                : error
                  ? "同步出错"
                  : lastResult
                    ? "同步完成"
                    : "云端同步"}
            </p>
            <p className="text-xs text-muted-foreground">
              上次同步：{lastSyncText}
              {totalTrips > 0 && (
                <>
                  {" · "}
                  已同步 {syncedTrips}/{totalTrips} 个行程
                </>
              )}
            </p>
            {/* 同步结果摘要 */}
            {lastResult && !syncing && (
              <p className="mt-1 text-xs text-muted-foreground">
                推送 {lastResult.pushed} 个 · 拉取 {lastResult.pulled} 个
                {lastResult.errors.length > 0 && (
                  <span className="text-destructive">
                    {" · "}{lastResult.errors.length} 个错误
                  </span>
                )}
              </p>
            )}
            {/* 错误详情 */}
            {error && !syncing && (
              <p className="mt-1 max-w-md text-xs text-destructive">{error}</p>
            )}
          </div>
        </div>

        {/* 右侧：同步按钮 */}
        <Button
          variant="outline"
          className="shrink-0"
          onClick={() => onSync()}
          loading={syncing}
          leftIcon={<RefreshCw className="h-4 w-4" />}
        >
          {syncing ? "同步中" : "立即同步"}
        </Button>
      </div>
    </div>
  );
}

/** 统计卡片 */
function ProfileStats({
  stats,
}: {
  stats: { total: number; publicTrips: number; completed: number; totalDays: number };
}) {
  const items = [
    { label: "总行程", value: stats.total, icon: Plane },
    { label: "公开行程", value: stats.publicTrips, icon: Globe },
    { label: "已完成", value: stats.completed, icon: ChartBar },
    { label: "旅行天数", value: stats.totalDays, icon: Calendar },
  ];
  return (
    <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="rounded-xl border border-border bg-card p-4 text-center"
          >
            <Icon className="mx-auto mb-2 h-5 w-5 text-primary" />
            <p className="text-2xl font-bold">{item.value}</p>
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </div>
        );
      })}
    </div>
  );
}

/** 行程列表 */
function TripList({ trips }: { trips: Trip[] }) {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">我的行程</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {trips.map((trip) => {
          const status = getTripStatusConfig(trip.status);
          const days = Math.max(0, daysBetween(trip.startDate, trip.endDate));
          return (
            <Link
              key={trip.id}
              href={`/trip/${trip.id}`}
              className="group rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
            >
              <div className="mb-2 flex items-center justify-between">
                <Badge variant={status.variant}>
                  {status.label}
                </Badge>
                <div className="flex items-center gap-1.5">
                  <span title={trip.cloudId ? "已同步到云端" : "仅本地"}>
                    {trip.cloudId ? (
                      <Cloud className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <CloudOff className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </span>
                  {trip.visibility === "public" ? (
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>
              </div>
              <h3 className="mb-1 font-semibold group-hover:text-primary">
                {trip.title}
              </h3>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {trip.destination}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {days} 天
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
