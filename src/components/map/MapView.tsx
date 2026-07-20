"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { getPlaceTypeConfig } from "@/lib/constants";
import { EmptyState } from "@/components/ui";
import { MapPin } from "lucide-react";
import type { Place } from "@/types";
import type { RouteInfo } from "@/lib/routing";

// 修复 Leaflet 默认图标问题
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// 每天一种颜色
const DAY_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

interface MapViewProps {
  places: Place[];
  routesByDay?: Record<number, RouteInfo[]>;
}

export default function MapView({ places, routesByDay }: MapViewProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // 主题感知的瓦片图层
  // 通过本地代理 API（/api/tile）获取高德瓦片，绕过 Chromium ORB 限制
  // 暗色模式通过 CSS filter 实现深色效果
  const tileUrl = "/api/tile/{z}/{x}/{y}?source=amap";
  const tileAttribution = '&copy; <a href="https://www.amap.com/">高德地图</a>';
  const tileClassName = isDark ? "leaflet-tile-dark-filter" : "";

  // 筛选有坐标的地点
  const geoPlaces = places.filter((p) => p.lat != null && p.lng != null);

  if (geoPlaces.length === 0) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <EmptyState
          icon={<MapPin className="h-12 w-12" />}
          title="地点暂无坐标信息"
          description="添加地点时填入经纬度即可在地图上显示"
        />
      </div>
    );
  }

  // 计算地图中心点
  const center: [number, number] = [
    geoPlaces.reduce((sum, p) => sum + (p.lat ?? 0), 0) / geoPlaces.length,
    geoPlaces.reduce((sum, p) => sum + (p.lng ?? 0), 0) / geoPlaces.length,
  ];

  // 按天分组
  const placesByDay = geoPlaces.reduce(
    (acc, place) => {
      if (!acc[place.dayIndex]) acc[place.dayIndex] = [];
      acc[place.dayIndex].push(place);
      return acc;
    },
    {} as Record<number, Place[]>
  );

  return (
    <MapContainer
      center={center}
      zoom={12}
      minZoom={3}
      maxZoom={18}
      scrollWheelZoom
      zoomSnap={1}
      className="h-full w-full"
    >
      {/* 修复 dynamic import 时容器尺寸未正确初始化的问题 */}
      <MapResizer />

      <TileLayer
        attribution={tileAttribution}
        url={tileUrl}
        className={tileClassName}
        // 性能优化：减少不必要的瓦片请求
        updateWhenZooming={false}
        updateWhenIdle={true}
        keepBuffer={2}
        maxZoom={18}
        minZoom={3}
        // 错误瓦片不复用空白，避免反复重试产生 ERR_ABORTED
        errorTileUrl="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNTYiIGhlaWdodD0iMjU2Ii8+"
      />

      {/* 标记 */}
      {geoPlaces.map((place) => {
        const config = getPlaceTypeConfig(place.type);
        const color = DAY_COLORS[place.dayIndex % DAY_COLORS.length];
        return (
          <Marker
            key={place.id}
            position={[place.lat!, place.lng!]}
            icon={L.divIcon({
              html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid var(--card); box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
              className: "custom-marker",
              iconSize: [24, 24],
              iconAnchor: [12, 24],
            })}
          >
            <Popup>
              <div className="text-foreground">
                <strong>{place.name}</strong>
                <br />
                <span style={{ color: config.color }}>{config.label}</span>
                <br />
                <span>第 {place.dayIndex + 1} 天</span>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* 每日路线连线 */}
      {Object.entries(placesByDay).map(([day, dayPlaces]) => {
        const dayNum = Number(day);
        const color = DAY_COLORS[dayNum % DAY_COLORS.length];
        const dayRoutes = routesByDay?.[dayNum];

        // 如果有 OSRM 路线，用真实道路坐标绘制每段路线
        if (dayRoutes && dayRoutes.length > 0) {
          return dayRoutes.map((route, idx) => (
            <Polyline
              key={`${day}-${idx}`}
              positions={route.geometry}
              pathOptions={{ color, weight: 4, opacity: 0.7 }}
            />
          ));
        }

        // 兜底：用直线连接
        const sorted = [...dayPlaces].sort((a, b) => a.order - b.order);
        const positions: [number, number][] = sorted.map((p) => [
          p.lat!,
          p.lng!,
        ]);
        return (
          <Polyline
            key={day}
            positions={positions}
            pathOptions={{ color, weight: 3, opacity: 0.6, dashArray: "8 8" }}
          />
        );
      })}
    </MapContainer>
  );
}

/**
 * 内部组件：在 MapContainer 内部调用 map.invalidateSize()
 * 修复 dynamic import + SSR=false 时容器尺寸未正确初始化的问题
 * 比全局 dispatch resize 事件更精准、更可靠
 */
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    // 延迟一帧确保 DOM 布局已完成
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 0);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}
