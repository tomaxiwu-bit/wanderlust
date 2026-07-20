"use client";

/**
 * 交通乘车方案弹窗
 *
 * 功能：
 * 1. 查询起终点附近的公共交通站点（通过 /api/transit 代理 Overpass API）
 * 2. 显示附近地铁站/公交站信息和所属线路
 * 3. 分析起终点共同线路，给出乘车建议
 * 4. 提供多个导航服务的深度链接（Google Maps、百度地图、高德地图）
 *
 * 注意：Overpass API 从中国可能不可达，部署到海外后可正常使用。
 * 无论 Overpass 是否可用，导航服务链接始终可用。
 */

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui";
import { formatDistance, formatTravelTime } from "@/lib/routing";
import {
  ExternalLink,
  Train,
  Bus,
  MapPin,
  Loader2,
  Navigation,
  AlertCircle,
  Info,
} from "lucide-react";

interface TransitStop {
  name: string;
  lat: number;
  lng: number;
  lines: string[];
  type: string;
  distance: number;
}

interface TransitGuideModalProps {
  open: boolean;
  onClose: () => void;
  origin: { name: string; lat: number; lng: number };
  destination: { name: string; lat: number; lng: number };
  /** 通勤估算（来自路线代理） */
  estimate?: {
    distance: number;
    duration: number;
  };
}

/** 构建导航服务链接 */
function buildNavLinks(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
) {
  return {
    google: `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=transit`,
    baidu: `https://api.map.baidu.com/direction?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&mode=transit&coord_type=wgs84&output=html&src=webapp.wanderlust`,
    amap: `https://uri.amap.com/navigation?from=${origin.lng},${origin.lat}&to=${destination.lng},${destination.lat}&mode=bus&src=wanderlust`,
  };
}

/** 分析共同线路 */
function findCommonLines(
  originStops: TransitStop[],
  destStops: TransitStop[]
): string[] {
  const originLines = new Set<string>();
  originStops.forEach((s) => s.lines.forEach((l) => originLines.add(l)));
  const common: string[] = [];
  destStops.forEach((s) =>
    s.lines.forEach((l) => {
      if (originLines.has(l) && !common.includes(l)) common.push(l);
    })
  );
  return common;
}

export function TransitGuideModal({
  open,
  onClose,
  origin,
  destination,
  estimate,
}: TransitGuideModalProps) {
  const [loading, setLoading] = useState(false);
  const [stops, setStops] = useState<{
    originStops: TransitStop[];
    destinationStops: TransitStop[];
    source: string;
  } | null>(null);

  const navLinks = buildNavLinks(origin, destination);

  useEffect(() => {
    if (!open) return;

    // AbortController 防止组件卸载后 setState
    const controller = new AbortController();
    setLoading(true);
    setStops(null);

    fetch(
      `/api/transit?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}`,
      { signal: controller.signal }
    )
      .then((res) => res.json())
      .then((data) => {
        if (controller.signal.aborted) return;
        setStops({
          originStops: data.originStops || [],
          destinationStops: data.destinationStops || [],
          source: data.source || "unavailable",
        });
      })
      .catch((err) => {
        if (controller.signal.aborted || err?.name === "AbortError") return;
        setStops({
          originStops: [],
          destinationStops: [],
          source: "unavailable",
        });
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [open, origin.lat, origin.lng, destination.lat, destination.lng]);

  const commonLines =
    stops && stops.originStops.length > 0 && stops.destinationStops.length > 0
      ? findCommonLines(stops.originStops, stops.destinationStops)
      : [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="乘车方案"
      description={`${origin.name} → ${destination.name}`}
      size="md"
      footer={
        <button
          onClick={onClose}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
        >
          关闭
        </button>
      }
    >
      <div className="space-y-4">
        {/* 通勤摘要 */}
        {estimate && (
          <div className="flex items-center gap-3 rounded-lg bg-secondary/50 px-4 py-3 text-sm">
            <Navigation className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-muted-foreground">
              直线距离约{" "}
              <strong className="text-foreground">
                {formatDistance(estimate.distance)}
              </strong>
              ，预计通行{" "}
              <strong className="text-foreground">
                {formatTravelTime(estimate.duration)}
              </strong>
            </span>
          </div>
        )}

        {/* 加载中 */}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">正在查询附近公共交通站点...</span>
          </div>
        )}

        {/* 查询结果 */}
        {!loading && stops && (
          <>
            {/* 共同线路提示 */}
            {commonLines.length > 0 && (
              <div className="rounded-lg border border-border bg-success/5 px-4 py-3">
                <div className="flex items-start gap-2">
                  <Train className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">
                      推荐直达线路
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {commonLines.slice(0, 3).join("、")} 可从起点附近直达终点附近
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 起点附近站点 */}
            {stops.originStops.length > 0 && (
              <StopList
                title="起点附近站点"
                stops={stops.originStops}
                icon={<MapPin className="h-4 w-4 text-primary" />}
              />
            )}

            {/* 终点附近站点 */}
            {stops.destinationStops.length > 0 && (
              <StopList
                title="终点附近站点"
                stops={stops.destinationStops}
                icon={<MapPin className="h-4 w-4 text-primary" />}
              />
            )}

            {/* 乘车步骤建议 */}
            {stops.originStops.length > 0 &&
              stops.destinationStops.length > 0 && (
                <div className="rounded-lg border border-border bg-background p-4">
                  <p className="mb-3 text-sm font-medium">建议乘车步骤</p>
                  <ol className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium">
                        1
                      </span>
                      <span>
                        步行至{" "}
                        <strong className="text-foreground">
                          {stops.originStops[0].name}
                      </strong>
                        （约 {Math.round(stops.originStops[0].distance / 80)}
                        分钟）
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium">
                        2
                      </span>
                      <span>
                        乘坐{" "}
                        <strong className="text-foreground">
                          {stops.originStops[0].lines[0] ||
                            stops.originStops[0].name.split("駅")[0] + "线"}
                      </strong>
                        {commonLines.length > 0
                          ? "（可直达）"
                          : "，在换乘站下车"}
                      </span>
                    </li>
                    {commonLines.length === 0 && (
                      <li className="flex items-start gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium">
                          3
                        </span>
                        <span>
                          换乘至{" "}
                          <strong className="text-foreground">
                            {stops.destinationStops[0].lines[0] ||
                              "目标线路"}
                      </strong>
                        </span>
                      </li>
                    )}
                    <li className="flex items-start gap-2">
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium`}
                      >
                        {commonLines.length > 0 ? 3 : 4}
                      </span>
                      <span>
                        在{" "}
                        <strong className="text-foreground">
                          {stops.destinationStops[0].name}
                      </strong>
                        下车，步行至目的地
                      </span>
                    </li>
                  </ol>
                </div>
              )}

            {/* 数据不可用提示 */}
            {stops.source === "unavailable" && (
              <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <div>
                  <p className="font-medium text-foreground">
                    站点数据暂不可用
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    公共交通站点数据服务（Overpass API）在当前网络环境下无法访问。
                    请使用下方导航服务查看详细乘车方案，或将应用部署到海外服务器以启用此功能。
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* 导航服务链接 */}
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
            <Info className="h-4 w-4 text-muted-foreground" />
            在导航应用中查看详细方案
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <a
              href={navLinks.google}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Google Maps
            </a>
            <a
              href={navLinks.baidu}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              百度地图
            </a>
            <a
              href={navLinks.amap}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              高德地图
            </a>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            点击链接将在新标签页打开对应导航服务，自动填入起终点并选择公共交通模式，可查看具体的线路、换乘和时刻表信息。
          </p>
        </div>
      </div>
    </Modal>
  );
}

/** 站点列表子组件 */
function StopList({
  title,
  stops,
  icon,
}: {
  title: string;
  stops: TransitStop[];
  icon: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
        {icon}
        {title}
      </div>
      <div className="space-y-1.5">
        {stops.map((stop, idx) => (
          <div
            key={`${stop.name}-${idx}`}
            className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium">
              {idx + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {stop.type === "station" || stop.type === "subway" ? (
                  <Train className="h-3.5 w-3.5 shrink-0 text-primary" />
                ) : (
                  <Bus className="h-3.5 w-3.5 shrink-0 text-primary" />
                )}
                <p className="truncate text-sm font-medium">{stop.name}</p>
              </div>
              {stop.lines.length > 0 && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {stop.lines.slice(0, 4).join(" · ")}
                </p>
              )}
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {stop.distance < 1000
                ? `${Math.round(stop.distance)}米`
                : `${(stop.distance / 1000).toFixed(1)}公里`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
