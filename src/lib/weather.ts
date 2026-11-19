import { findDestinationCoords, matchDestinationCountry } from "@/lib/destinations";
import { tempToClimate, type ClimateChoice } from "@/lib/rules/generator";

/** Open-Meteo 預報大致可查未來天數；超過則改查去年同期。 */
export const WEATHER_FORECAST_HORIZON_DAYS = 16;

export type WeatherPrecip = "none" | "rain" | "snow" | "mix";

export type WeatherDay = {
  date: string;
  tMax: number;
  tMin: number;
  /** 日降水量 mm */
  precipMm: number;
  /** 日降雪量 cm（Open-Meteo snowfall_sum） */
  snowCm: number;
  /** 預報才有：當日最大降水機率 % */
  precipChance: number | null;
  precip: WeatherPrecip;
};

export type WeatherResult = {
  placeName: string;
  latitude: number;
  longitude: number;
  source: "forecast" | "historical";
  days: WeatherDay[];
  avgTempC: number;
  climate: Exclude<ClimateChoice, "auto">;
  rainDays: number;
  snowDays: number;
  /** 若為歷史資料：提醒出發前幾天會換成預報 */
  forecastAvailableDaysBefore: number | null;
  summary: string;
};

const RAIN_MM_THRESHOLD = 0.5;
const SNOW_CM_THRESHOLD = 0.1;

export function classifyPrecip(precipMm: number, snowCm: number): WeatherPrecip {
  const raining = precipMm >= RAIN_MM_THRESHOLD;
  const snowing = snowCm >= SNOW_CM_THRESHOLD;
  if (raining && snowing) return "mix";
  if (snowing) return "snow";
  if (raining) return "rain";
  return "none";
}

export function precipLabel(precip: WeatherPrecip): string {
  if (precip === "snow") return "下雪";
  if (precip === "rain") return "下雨";
  if (precip === "mix") return "雨雪";
  return "";
}

/** 單日天氣表情：降水優先，否則依當日均溫。 */
export function weatherDayEmoji(day: Pick<WeatherDay, "tMax" | "tMin" | "precip" | "precipChance">): string {
  if (day.precip === "snow") return "❄️";
  if (day.precip === "mix") return "🌨️";
  if (day.precip === "rain") return "🌧️";
  if (day.precipChance != null && day.precipChance >= 60) return "🌦️";
  const avg = (day.tMax + day.tMin) / 2;
  if (avg >= 28) return "🥵";
  if (avg >= 22) return "☀️";
  if (avg >= 16) return "🌤️";
  if (avg >= 10) return "🌥️";
  if (avg >= 0) return "🧥";
  return "🥶";
}

/** 整段行程摘要表情（依雨雪天數與氣候）。 */
export function weatherSummaryEmoji(input: {
  climate: Exclude<ClimateChoice, "auto">;
  rainDays: number;
  snowDays: number;
}): string {
  if (input.snowDays > 0 && input.rainDays > 0) return "🌨️";
  if (input.snowDays > 0) return "❄️";
  if (input.rainDays > 0) return "🌧️";
  if (input.climate === "hot") return "🥵";
  if (input.climate === "warm") return "☀️";
  if (input.climate === "cool") return "🌤️";
  return "🧥";
}

function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

function shiftYear(date: Date, deltaYears: number): Date {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + deltaYears);
  return next;
}

export function tripEndDate(startDate: string, days: number): string | null {
  const start = parseIsoDate(startDate);
  if (!start || !Number.isInteger(days) || days < 1) return null;
  return formatIso(addDays(start, days - 1));
}

export function shouldUseForecast(startDate: string, today = new Date()): boolean {
  const start = parseIsoDate(startDate);
  if (!start) return false;
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);
  const untilStart = daysBetween(todayStart, start);
  return untilStart <= WEATHER_FORECAST_HORIZON_DAYS;
}

type GeoHit = {
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
};

const GEO_HEADERS = {
  Accept: "application/json",
  "User-Agent": "EZpakku/1.0 (packing weather; https://ezpakku.vercel.app)",
};

async function geocode(query: string): Promise<GeoHit | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", trimmed);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "zh");
  const response = await fetch(url, { headers: GEO_HEADERS, next: { revalidate: 86400 } });
  if (!response.ok) throw new Error("地點查詢失敗");
  const data = (await response.json()) as { results?: GeoHit[] };
  return data.results?.[0] ?? null;
}

/** Open-Meteo 對「國家 城市」合併字串常查不到；分開試，並優先用地圖目錄座標。 */
export async function resolveWeatherPlace(input: {
  country?: string;
  city?: string;
  location?: string;
}): Promise<{ placeName: string; latitude: number; longitude: number }> {
  const country = input.country?.trim() ?? "";
  const city = input.city?.trim() ?? "";
  const location = input.location?.trim() ?? "";

  const fromCatalog =
    (country || city ? findDestinationCoords(country || location, city || undefined) : null) ??
    (location.includes(" ")
      ? (() => {
          const [maybeCountry, ...rest] = location.split(/\s+/);
          return findDestinationCoords(maybeCountry, rest.join(" "));
        })()
      : findDestinationCoords(location));
  if (fromCatalog) return fromCatalog;

  const queries = [
    city,
    country && city ? city : "",
    country,
    location,
    city.replace(/[市縣區]$/u, ""),
    // 繁簡常見差異
    country === "中國" ? "中国" : "",
    city === "首爾" ? "Seoul" : "",
    city === "東京" ? "Tokyo" : "",
    city === "大阪" ? "Osaka" : "",
    city === "曼谷" ? "Bangkok" : "",
    city === "台北" ? "台北市" : "",
  ].filter((query, index, list) => Boolean(query) && list.indexOf(query) === index);

  for (const query of queries) {
    const hit = await geocode(query);
    if (!hit) continue;
    const placeName = [hit.name, hit.admin1, hit.country].filter(Boolean).join(" · ");
    return { placeName, latitude: hit.latitude, longitude: hit.longitude };
  }

  // 只有國家名時，用地圖目錄第一個城市當錨點
  const matchedCountry = matchDestinationCountry(country || location);
  if (matchedCountry?.places[0]) {
    const place = matchedCountry.places[0];
    return {
      placeName: matchedCountry.name,
      latitude: place.latitude,
      longitude: place.longitude,
    };
  }

  throw new Error("找不到這個地點，請改成城市或國家名稱再試");
}

type DailyPayload = {
  daily?: {
    time: string[];
    temperature_2m_max: (number | null)[];
    temperature_2m_min: (number | null)[];
    precipitation_sum?: (number | null)[];
    snowfall_sum?: (number | null)[];
    precipitation_probability_max?: (number | null)[];
  };
};

async function fetchDaily(
  latitude: number,
  longitude: number,
  start: string,
  end: string,
  source: "forecast" | "historical",
): Promise<WeatherDay[]> {
  const base =
    source === "forecast" ? "https://api.open-meteo.com/v1/forecast" : "https://archive-api.open-meteo.com/v1/archive";
  const url = new URL(base);
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("start_date", start);
  url.searchParams.set("end_date", end);
  url.searchParams.set(
    "daily",
    source === "forecast"
      ? "temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum,precipitation_probability_max"
      : "temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum",
  );
  url.searchParams.set("timezone", "auto");
  const response = await fetch(url, {
    headers: GEO_HEADERS,
    next: { revalidate: source === "forecast" ? 3600 : 86400 },
  });
  if (!response.ok) throw new Error(source === "forecast" ? "天氣預報查詢失敗" : "歷史天氣查詢失敗");
  const data = (await response.json()) as DailyPayload;
  const times = data.daily?.time ?? [];
  const maxes = data.daily?.temperature_2m_max ?? [];
  const mins = data.daily?.temperature_2m_min ?? [];
  const precipSums = data.daily?.precipitation_sum ?? [];
  const snowSums = data.daily?.snowfall_sum ?? [];
  const precipChances = data.daily?.precipitation_probability_max ?? [];
  const days: WeatherDay[] = [];
  for (let index = 0; index < times.length; index += 1) {
    const tMax = maxes[index];
    const tMin = mins[index];
    if (tMax == null || tMin == null) continue;
    const precipMm = precipSums[index] ?? 0;
    const snowCm = snowSums[index] ?? 0;
    const chance = precipChances[index];
    days.push({
      date: times[index],
      tMax,
      tMin,
      precipMm,
      snowCm,
      precipChance: chance == null ? null : chance,
      precip: classifyPrecip(precipMm, snowCm),
    });
  }
  return days;
}

function precipSummaryLine(rainDays: number, snowDays: number, source: "forecast" | "historical"): string {
  if (rainDays === 0 && snowDays === 0) {
    return source === "forecast" ? "期間預報偏乾。" : "去年同期偏乾。";
  }
  const parts: string[] = [];
  if (rainDays > 0) parts.push(`${rainDays} 天有雨`);
  if (snowDays > 0) parts.push(`${snowDays} 天有雪`);
  const prefix = source === "forecast" ? "期間約" : "去年同期約";
  return `${prefix}${parts.join("、")}。`;
}

function buildSummary(result: Omit<WeatherResult, "summary">): string {
  const range = `${Math.round(Math.min(...result.days.map((day) => day.tMin)))}～${Math.round(
    Math.max(...result.days.map((day) => day.tMax)),
  )}°C`;
  const climateLabel =
    result.climate === "hot" ? "偏熱" : result.climate === "warm" ? "溫暖" : result.climate === "cool" ? "偏涼" : "偏冷";
  const precipLine = precipSummaryLine(result.rainDays, result.snowDays, result.source);
  if (result.source === "forecast") {
    return `${result.placeName} 旅遊期間預報約 ${range}（${climateLabel}）。${precipLine}`;
  }
  const ahead = result.forecastAvailableDaysBefore ?? WEATHER_FORECAST_HORIZON_DAYS;
  return `${result.placeName} 尚無旅遊期間預報，先參考去年同期約 ${range}（${climateLabel}）。${precipLine}出發前約 ${ahead} 天會更新為當地天氣預報。`;
}

export async function lookupWeather(input: {
  country?: string;
  city?: string;
  location?: string;
  startDate: string;
  days: number;
}): Promise<WeatherResult> {
  const endDate = tripEndDate(input.startDate, input.days);
  if (!input.country?.trim() && !input.city?.trim() && !input.location?.trim()) {
    throw new Error("請先填地點");
  }
  if (!endDate) throw new Error("出發日或天數不正確");

  const geo = await resolveWeatherPlace({
    country: input.country,
    city: input.city,
    location: input.location,
  });

  const useForecast = shouldUseForecast(input.startDate);
  let source: "forecast" | "historical" = useForecast ? "forecast" : "historical";
  let rangeStart = input.startDate;
  let rangeEnd = endDate;

  if (!useForecast) {
    const start = parseIsoDate(input.startDate)!;
    const end = parseIsoDate(endDate)!;
    rangeStart = formatIso(shiftYear(start, -1));
    rangeEnd = formatIso(shiftYear(end, -1));
  }

  let days = await fetchDaily(geo.latitude, geo.longitude, rangeStart, rangeEnd, source);
  if (days.length === 0 && source === "forecast") {
    source = "historical";
    const start = parseIsoDate(input.startDate)!;
    const end = parseIsoDate(endDate)!;
    days = await fetchDaily(
      geo.latitude,
      geo.longitude,
      formatIso(shiftYear(start, -1)),
      formatIso(shiftYear(end, -1)),
      "historical",
    );
  }
  if (days.length === 0) throw new Error("暫時查不到天氣資料");

  const avgTempC =
    days.reduce((sum, day) => sum + (day.tMax + day.tMin) / 2, 0) / days.length;
  const climate = tempToClimate(avgTempC);
  const rainDays = days.filter((day) => day.precip === "rain" || day.precip === "mix").length;
  const snowDays = days.filter((day) => day.precip === "snow" || day.precip === "mix").length;
  const base = {
    placeName: geo.placeName,
    latitude: geo.latitude,
    longitude: geo.longitude,
    source,
    days,
    avgTempC,
    climate,
    rainDays,
    snowDays,
    forecastAvailableDaysBefore: source === "historical" ? WEATHER_FORECAST_HORIZON_DAYS : null,
  };
  return { ...base, summary: buildSummary(base) };
}
