"use client";

import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { useTripStore } from "@/stores/trip-store";
import { useHydrated } from "@/hooks/useHydrated";
import { formatDate, daysBetween, cn } from "@/lib/utils";
import { getTripStatusConfig } from "@/lib/constants";
import { Badge } from "@/components/ui";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Calendar,
  ListOrdered,
  Globe,
  Wallet,
  NotebookPen,
  Backpack,
  Loader2,
} from "lucide-react";

const tabs = [
  { href: "", label: "概览", icon: ListOrdered },
  { href: "/itinerary", label: "日程编排", icon: Calendar },
  { href: "/map", label: "地图", icon: Globe },
  { href: "/budget", label: "预算", icon: Wallet },
  { href: "/notes", label: "笔记", icon: NotebookPen },
  { href: "/packing", label: "打包", icon: Backpack },
];

export default function TripLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ tripId: string }>();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const trip = useTripStore((s) => s.trips.find((t) => t.id === params.tripId));

  // Zustand persist hydrates from localStorage on the client only.
  // Show a loading state until hydrated to avoid SSR mismatch.
  if (!hydrated) {
    return (
      <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-20 sm:px-6 lg:px-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold">行程不存在</h1>
        <p className="mt-2 text-muted-foreground">
          该行程可能已被删除，或链接有误。
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          返回行程列表
        </Link>
      </div>
    );
  }

  const status = getTripStatusConfig(trip.status);
  const days = daysBetween(trip.startDate, trip.endDate);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* 返回 */}
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        返回行程列表
      </Link>

      {/* 行程头部 */}
      <div className="mb-6 rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <Badge variant={status.variant}>
                {status.label}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {days} 天行程
              </span>
            </div>
            <h1 className="text-2xl font-bold">{trip.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {trip.destination}
              </span>
              <span className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                {formatDate(trip.startDate, "short")} -{" "}
                {formatDate(trip.endDate, "short")}
              </span>
            </div>
            {trip.description && (
              <p className="mt-3 text-sm text-muted-foreground">
                {trip.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="mb-6 border-b border-border">
        <nav className="flex gap-1 overflow-x-auto scrollbar-hide -mb-px">
          {tabs.map((tab) => {
            const href = `/trip/${trip.id}${tab.href}`;
            const fullPath = `/trip/${trip.id}${tab.href}`;
            // 概览页（tab.href === ""）精确匹配，其他页前缀匹配
            const isActive =
              tab.href === ""
                ? pathname === fullPath
                : pathname.startsWith(fullPath);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={href}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:border-primary/50 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* 子页面内容 */}
      {children}
    </div>
  );
}
