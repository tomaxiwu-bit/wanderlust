/**
 * 天气预报集成模块
 *
 * 灵感来源：Open-Meteo 免费 API + 旅行类应用的天气集成
 *
 * 特点：
 * - 使用 Open-Meteo 免费无需 API Key
 * - 支持 CORS 直接前端调用
 * - 结果缓存到 localStorage 避免重复请求
 * - 最多 16 天预报，超出则返回气候参考
 */

/** 天气代码到描述和图标的映射（WMO Weather Code） */
export const WEATHER_CODES: Record<number, { label: string; icon: string }> = {
  0: { label: "晴", icon: "Sun" },
  1: { label: "晴间多云", icon: "Sun" },
  2: { label: "多云", icon: "CloudSun" },
  3: { label: "阴", icon: "Cloud" },
  45: { label: "雾", icon: "CloudFog" },
  48: { label: "冻雾", icon: "CloudFog" },
  51: { label: "小毛毛雨", icon: "CloudDrizzle" },
  53: { label: "毛毛雨", icon: "CloudDrizzle" },
  55: { label: "大毛毛雨", icon: "CloudDrizzle" },
  56: { label: "冻毛毛雨", icon: "CloudDrizzle" },
  57: { label: "强冻毛毛雨", icon: "CloudDrizzle" },
  61: { label: "小雨", icon: "CloudRain" },
  63: { label: "中雨", icon: "CloudRain" },
  65: { label: "大雨", icon: "CloudRain" },
  66: { label: "冻雨", icon: "CloudRain" },
  67: { label: "强冻雨", icon: "CloudRain" },
  71: { label: "小雪", icon: "CloudSnow" },
  73: { label: "中雪", icon: "CloudSnow" },
  75: { label: "大雪", icon: "CloudSnow" },
  77: { label: "雪粒", icon: "CloudSnow" },
  80: { label: "阵雨", icon: "CloudRain" },
  81: { label: "中阵雨", icon: "CloudRain" },
  82: { label: "强阵雨", icon: "CloudRain" },
  85: { label: "阵雪", icon: "CloudSnow" },
  86: { label: "强阵雪", icon: "CloudSnow" },
  95: { label: "雷暴", icon: "CloudLightning" },
  96: { label: "雷暴冰雹", icon: "CloudLightning" },
  99: { label: "强雷暴冰雹", icon: "CloudLightning" },
};

/** 天气数据 */
export interface WeatherData {
  date: string; // ISO date
  maxTemp: number;
  minTemp: number;
  weatherCode: number;
  precipitation: number; // mm
  windSpeed: number; // km/h
}

/** 获取天气配置 */
export function getWeatherConfig(code: number): { label: string; icon: string } {
  return WEATHER_CODES[code] ?? { label: "未知", icon: "CloudOff" };
}

/** 判断是否为恶劣天气 */
export function isBadWeather(data: WeatherData): boolean {
  // 雷暴、大雨、大雪
  if ([95, 96, 99, 65, 75, 82, 86].includes(data.weatherCode)) return true;
  // 降水量 > 10mm
  if (data.precipitation > 10) return true;
  // 风速 > 40 km/h
  if (data.windSpeed > 40) return true;
  return false;
}

/** 缓存 key */
function getCacheKey(lat: number, lng: number, date: string): string {
  return `weather_${lat.toFixed(2)}_${lng.toFixed(2)}_${date}`;
}

/** 缓存有效期 6 小时 */
const CACHE_TTL = 6 * 60 * 60 * 1000;

interface CachedWeather {
  data: WeatherData | null;
  timestamp: number;
}

/** 从缓存读取 */
function getCachedWeather(lat: number, lng: number, date: string): WeatherData | null {
  try {
    const raw = localStorage.getItem(getCacheKey(lat, lng, date));
    if (!raw) return null;
    const cached: CachedWeather = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL) return null;
    return cached.data;
  } catch {
    return null;
  }
}

/** 写入缓存 */
function setCachedWeather(lat: number, lng: number, date: string, data: WeatherData | null) {
  try {
    const cached: CachedWeather = { data, timestamp: Date.now() };
    localStorage.setItem(getCacheKey(lat, lng, date), JSON.stringify(cached));
  } catch {
    // 忽略配额错误
  }
}

/**
 * 获取指定坐标和日期的天气预报
 *
 * 使用 Open-Meteo 免费 API，无需 API Key
 * 最多支持未来 16 天预报
 *
 * @param lat 纬度
 * @param lng 经度
 * @param dateStr ISO 日期字符串 (yyyy-MM-dd)
 */
export async function fetchWeather(
  lat: number,
  lng: number,
  dateStr: string
): Promise<WeatherData | null> {
  // 检查缓存
  const cached = getCachedWeather(lat, lng, dateStr);
  if (cached) return cached;

  // 计算日期差
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // 超出 16 天预报范围
  if (diffDays > 16 || diffDays < -2) {
    setCachedWeather(lat, lng, dateStr, null);
    return null;
  }

  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lng.toString(),
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
      timezone: "auto",
      forecast_days: "16",
    });

    const url = `https://api.open-meteo.com/v1/forecast?${params}`;
    const res = await fetch(url);

    if (!res.ok) {
      setCachedWeather(lat, lng, dateStr, null);
      return null;
    }

    const json = await res.json();
    const dates: string[] = json.daily?.time ?? [];
    const idx = dates.indexOf(dateStr);

    if (idx === -1) {
      setCachedWeather(lat, lng, dateStr, null);
      return null;
    }

    const data: WeatherData = {
      date: dateStr,
      maxTemp: Math.round(json.daily.temperature_2m_max[idx]),
      minTemp: Math.round(json.daily.temperature_2m_min[idx]),
      weatherCode: json.daily.weather_code[idx],
      precipitation: json.daily.precipitation_sum[idx] ?? 0,
      windSpeed: Math.round(json.daily.wind_speed_10m_max[idx] ?? 0),
    };

    setCachedWeather(lat, lng, dateStr, data);
    return data;
  } catch {
    // 网络错误等
    return null;
  }
}

/**
 * 批量获取多天天气
 */
export async function fetchWeatherRange(
  lat: number,
  lng: number,
  dateStrings: string[]
): Promise<Map<string, WeatherData | null>> {
  const results = new Map<string, WeatherData | null>();
  const promises = dateStrings.map(async (date) => {
    const data = await fetchWeather(lat, lng, date);
    results.set(date, data);
  });
  await Promise.all(promises);
  return results;
}
