"use client";

/**
 * 足迹地图组件
 *
 * 在世界地图上展示用户所有行程去过的地点
 * 使用 Leaflet + 高德瓦片（通过本地代理）
 * 按行程颜色区分不同行程的地点
 */

import {
  MapContainer,
  TileLayer,
  Popup,
  CircleMarker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { getPlaceTypeConfig } from "@/lib/constants";
import Link from "next/link";

// 行程颜色调色板
const TRIP_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
];

export interface AtlasMarkerData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  tripId: string;
  tripTitle: string;
  destination: string;
  type: string;
}

interface AtlasMapProps {
  markers: AtlasMarkerData[];
}

export default function AtlasMap({ markers }: AtlasMapProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const tileUrl = "/api/tile/{z}/{x}/{y}?source=osm";
  const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> 贡献者';
  const tileClassName = isDark ? "leaflet-tile-dark-filter" : "";

  if (markers.length === 0) return null;

  // 为每个行程分配颜色
  const tripColorMap: Record<string, string> = {};
  const uniqueTripIds = [...new Set(markers.map((m) => m.tripId))];
  uniqueTripIds.forEach((tripId, idx) => {
    tripColorMap[tripId] = TRIP_COLORS[idx % TRIP_COLORS.length];
  });

  // 计算地图中心和缩放级别，使所有标记可见
  const lats = markers.map((m) => m.lat);
  const lngs = markers.map((m) => m.lng);
  const center: [number, number] = [
    (Math.min(...lats) + Math.max(...lats)) / 2,
    (Math.min(...lngs) + Math.max(...lngs)) / 2,
  ];

  // 如果只有一个点，使用固定缩放
  const hasMultiple = markers.length > 1;

  return (
    <MapContainer
      center={center}
      zoom={hasMultiple ? 5 : 12}
      minZoom={2}
      maxZoom={18}
      scrollWheelZoom
      zoomSnap={1}
      className="h-full w-full"
    >
      <MapResizer />
      <FitBounds markers={markers} />

      <TileLayer
        attribution={tileAttribution}
        url={tileUrl}
        className={tileClassName}
        updateWhenZooming={false}
        updateWhenIdle={true}
        keepBuffer={2}
        maxZoom={18}
        minZoom={2}
        errorTileUrl="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNTYiIGhlaWdodD0iMjU2Ii8+"
      />

      {/* 标记：使用 CircleMarker 避免图标加载问题，更适合世界视图 */}
      {markers.map((marker) => {
        const color = tripColorMap[marker.tripId];
        const config = getPlaceTypeConfig(marker.type);
        return (
          <CircleMarker
            key={marker.id}
            center={[marker.lat, marker.lng]}
            radius={6}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: 0.8,
              weight: 2,
            }}
          >
            <Popup>
              <div className="min-w-[160px]">
                <strong className="block">{marker.name}</strong>
                <span
                  className="text-xs"
                  style={{ color: config.color }}
                >
                  {config.label}
                </span>
                <div className="mt-1.5 border-t border-border pt-1.5 text-xs">
                  <p className="text-muted-foreground">
                    <span
                      className="mr-1 inline-block h-2 w-2 rounded-full align-middle"
                      style={{ backgroundColor: color }}
                    />
                    {marker.tripTitle}
                  </p>
                  <p className="text-muted-foreground">{marker.destination}</p>
                  <Link
                    href={`/trip/${marker.tripId}`}
                    className="mt-1 inline-block text-primary hover:underline"
                  >
                    查看行程 →
                  </Link>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}

/**
 * 自动调整地图视野以包含所有标记
 */
function FitBounds({ markers }: { markers: AtlasMarkerData[] }) {
  const map = useMap();

  useEffect(() => {
    if (markers.length === 0) return;
    if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 12);
      return;
    }
    const bounds = L.latLngBounds(
      markers.map((m) => [m.lat, m.lng] as [number, number])
    );
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
  }, [map, markers]);

  return null;
}

/**
 * 修复 dynamic import 时容器尺寸未正确初始化的问题
 */
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}
