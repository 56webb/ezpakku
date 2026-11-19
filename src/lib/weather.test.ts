import { describe, expect, it } from "vitest";
import {
  classifyPrecip,
  precipLabel,
  resolveWeatherPlace,
  shouldUseForecast,
  tripEndDate,
  weatherDayEmoji,
  weatherSummaryEmoji,
  WEATHER_FORECAST_HORIZON_DAYS,
} from "@/lib/weather";

describe("weather helpers", () => {
  it("computes trip end inclusive of start", () => {
    expect(tripEndDate("2026-07-01", 3)).toBe("2026-07-03");
    expect(tripEndDate("bad", 3)).toBeNull();
  });

  it("uses forecast only within horizon", () => {
    const today = new Date("2026-06-01T12:00:00");
    expect(shouldUseForecast("2026-06-10", today)).toBe(true);
    expect(shouldUseForecast("2026-06-17", today)).toBe(true);
    expect(shouldUseForecast("2026-06-18", today)).toBe(false);
    expect(WEATHER_FORECAST_HORIZON_DAYS).toBe(16);
  });

  it("resolves catalog places without geocoding", async () => {
    const tokyo = await resolveWeatherPlace({ country: "日本", city: "東京" });
    expect(tokyo.latitude).toBeCloseTo(35.6895, 2);
    expect(tokyo.placeName).toContain("東京");

    const china = await resolveWeatherPlace({ country: "中國", city: "江南水鄉" });
    expect(china.placeName).toContain("江南水鄉");
  });

  it("classifies rain and snow", () => {
    expect(classifyPrecip(0, 0)).toBe("none");
    expect(classifyPrecip(2, 0)).toBe("rain");
    expect(classifyPrecip(0, 1)).toBe("snow");
    expect(classifyPrecip(3, 1)).toBe("mix");
    expect(precipLabel("rain")).toBe("下雨");
    expect(precipLabel("snow")).toBe("下雪");
    expect(weatherDayEmoji({ tMax: 12, tMin: 8, precip: "rain", precipChance: null })).toBe("🌧️");
    expect(weatherDayEmoji({ tMax: 0, tMin: -2, precip: "snow", precipChance: null })).toBe("❄️");
    expect(weatherDayEmoji({ tMax: 34, tMin: 28, precip: "none", precipChance: null })).toBe("🥵");
    expect(weatherSummaryEmoji({ climate: "warm", rainDays: 2, snowDays: 0 })).toBe("🌧️");
  });
});
