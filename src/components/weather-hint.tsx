"use client";

import { useEffect, useRef, useState } from "react";
import type { ClimateChoice } from "@/lib/rules/generator";
import { precipLabel, weatherDayEmoji, weatherSummaryEmoji, type WeatherResult } from "@/lib/weather";

/** 預設先列這麼多天；超過可展開看完整列表。 */
export const WEATHER_PREVIEW_DAYS = 15;

type Props = {
  country: string;
  city: string;
  startDate: string;
  days: string;
  onClimate?: (climate: ClimateChoice) => void;
};

export function WeatherHint({ country, city, startDate, days, onClimate }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [weather, setWeather] = useState<WeatherResult | null>(null);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [shotHint, setShotHint] = useState("");
  const onClimateRef = useRef(onClimate);
  onClimateRef.current = onClimate;

  useEffect(() => {
    const dayCount = Number(days);
    const hasPlace = Boolean(country.trim() || city.trim());
    if (!hasPlace || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !Number.isInteger(dayCount) || dayCount < 1) {
      setStatus("idle");
      setWeather(null);
      setError("");
      setExpanded(false);
      setShotHint("");
      onClimateRef.current?.("auto");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setStatus("loading");
      setError("");
      setExpanded(false);
      setShotHint("");
      const params = new URLSearchParams({
        country: country.trim(),
        city: city.trim(),
        startDate,
        days: String(dayCount),
      });
      void fetch(`/api/weather?${params}`, { signal: controller.signal })
        .then(async (response) => {
          const data = (await response.json()) as { ok: boolean; weather?: WeatherResult; reason?: string };
          if (!data.ok || !data.weather) throw new Error(data.reason ?? "天氣查詢失敗");
          setWeather(data.weather);
          setStatus("ready");
          onClimateRef.current?.(data.weather.climate);
        })
        .catch((caught: unknown) => {
          if (controller.signal.aborted) return;
          setWeather(null);
          setStatus("error");
          setError(caught instanceof Error ? caught.message : "天氣查詢失敗");
          onClimateRef.current?.("auto");
        });
    }, 450);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [country, city, startDate, days]);

  if (status === "idle") return null;

  const totalDays = weather?.days.length ?? 0;
  const canCollapse = totalDays > WEATHER_PREVIEW_DAYS;
  const visibleDays = weather
    ? expanded || !canCollapse
      ? weather.days
      : weather.days.slice(0, WEATHER_PREVIEW_DAYS)
    : [];

  return (
    <section className="wire-card flex flex-col gap-2" aria-live="polite" data-testid="weather-hint">
      <p className="text-sm font-bold">
        當地天氣
        {status === "ready" && weather
          ? ` ${weatherSummaryEmoji({
              climate: weather.climate,
              rainDays: weather.rainDays,
              snowDays: weather.snowDays,
            })}`
          : ""}
      </p>
      {status === "loading" ? <p className="text-sm text-[var(--ink-soft)]">查詢中…</p> : null}
      {status === "error" ? <p className="text-sm text-[var(--warn)]">{error}</p> : null}
      {status === "ready" && weather ? (
        <>
          <p className="text-sm leading-6">{weather.summary}</p>
          {weather.source === "historical" ? (
            <p className="text-xs text-[var(--ink-soft)]">
              歷史天氣僅供參考；出發前約 {weather.forecastAvailableDaysBefore ?? 16}{" "}
              天會改查旅遊期間當地預報。打包氣候已先依去年同期估算。
            </p>
          ) : (
            <p className="text-xs text-[var(--ink-soft)]">已用預報氣溫估算打包氣候。</p>
          )}
          <p className="text-xs text-[var(--ink-soft)]" data-testid="weather-day-limit">
            {canCollapse
              ? `共 ${totalDays} 天；畫面先列 ${WEATHER_PREVIEW_DAYS} 天，可展開看完整列表。`
              : `共 ${totalDays} 天，可一次看完。`}
          </p>
          <ul className="max-h-56 overflow-y-auto text-xs text-[var(--ink-soft)]">
            {visibleDays.map((day) => {
              const label = precipLabel(day.precip);
              const chance =
                day.precipChance != null && day.precipChance >= 40 ? `降水機率 ${day.precipChance}%` : "";
              const detail = [label, chance].filter(Boolean).join(" · ");
              return (
                <li key={day.date}>
                  <span aria-hidden="true">{weatherDayEmoji(day)}</span> {day.date}　
                  {Math.round(day.tMin)}～{Math.round(day.tMax)}°C
                  {detail ? `　${detail}` : ""}
                </li>
              );
            })}
          </ul>
          {canCollapse && !expanded ? (
            <button
              type="button"
              className="wire-btn"
              data-testid="weather-expand"
              onClick={() => setExpanded(true)}
            >
              展開看完整 {totalDays} 天
            </button>
          ) : null}
          {expanded ? (
            <>
              <button
                type="button"
                className="wire-btn"
                data-testid="weather-collapse"
                onClick={() => {
                  setExpanded(false);
                  setShotHint("");
                }}
              >
                收合為前 {WEATHER_PREVIEW_DAYS} 天
              </button>
              <button
                type="button"
                className="wire-btn wire-btn-primary"
                data-testid="weather-screenshot-hint"
                onClick={() =>
                  setShotHint("展開後內容較長，建議現在截圖保存，之後打包可以對照每日天氣。")
                }
              >
                提醒截圖
              </button>
              {shotHint ? (
                <p className="text-sm leading-6 text-[var(--accent-strong)]" role="status">
                  {shotHint}
                </p>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
