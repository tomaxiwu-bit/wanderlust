"use client";

/**
 * 天气徽章组件
 *
 * 灵感来源：Open-Meteo + 旅行类应用的天气集成
 * 在每日行程卡片上显示天气信息
 * 恶劣天气时显示警告
 */

import { useEffect, useState } from "react";
import type { WeatherData } from "@/lib/weather";
import { getWeatherConfig, isBadWeather } from "@/lib/weather";
import {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudOff,
  AlertTriangle,
  Loader2,
} from "lucide-react";

const ICON_MAP: Record<string, typeof Sun> = {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudOff,
};

interface WeatherBadgeProps {
  weather: WeatherData | null;
  loading?: boolean;
}

export function WeatherBadge({ weather, loading }: WeatherBadgeProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (loading && !weather) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary/50 px-2.5 py-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        天气加载中
      </div>
    );
  }

  if (!weather || !mounted) {
    return null;
  }

  const config = getWeatherConfig(weather.weatherCode);
  const Icon = ICON_MAP[config.icon] ?? CloudOff;
  const bad = isBadWeather(weather);

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${
        bad
          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
          : "bg-secondary/60 text-muted-foreground"
      }`}
      title={`${config.label} · 降水 ${weather.precipitation}mm · 风速 ${weather.windSpeed}km/h`}
    >
      {bad && <AlertTriangle className="h-3 w-3" />}
      <Icon className="h-3 w-3" />
      <span>{config.label}</span>
      <span className="font-medium">
        {weather.minTemp}°~{weather.maxTemp}°
      </span>
    </div>
  );
}
