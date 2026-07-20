"use client";

/**
 * 行程天气数据 Hook
 *
 * 根据行程的目的地坐标和日期范围，批量获取每日天气
 */

import { useState, useEffect } from "react";
import type { WeatherData } from "@/lib/weather";
import { fetchWeatherRange } from "@/lib/weather";
import { daysBetween } from "@/lib/utils";
import { parseISO, addDays, format } from "date-fns";
import type { Trip } from "@/types";

interface TripWeatherState {
  weather: Map<string, WeatherData | null>;
  loading: boolean;
}

export function useTripWeather(trip: Trip | undefined, lat?: number, lng?: number): TripWeatherState {
  const [state, setState] = useState<TripWeatherState>({
    weather: new Map(),
    loading: false,
  });

  useEffect(() => {
    if (!trip || lat == null || lng == null) {
      setState({ weather: new Map(), loading: false });
      return;
    }

    const days = daysBetween(trip.startDate, trip.endDate);
    const dates: string[] = [];
    for (let i = 0; i < days; i++) {
      dates.push(format(addDays(parseISO(trip.startDate), i), "yyyy-MM-dd"));
    }

    let cancelled = false;
    setState({ weather: new Map(), loading: true });

    fetchWeatherRange(lat, lng, dates).then((result) => {
      if (!cancelled) {
        setState({ weather: result, loading: false });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [trip, lat, lng]);

  return state;
}
