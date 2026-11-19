"use client";

import { useMemo, useState } from "react";
import { useCatalog } from "@/hooks/use-catalog";
import { categoryName } from "@/lib/catalog/local";
import { LUGGAGE_PLANS, PREVIEW_CLIMATES, previewCatalog, TRAVEL_TYPES } from "@/lib/catalog/preview";
import type { CatalogPreviewInput } from "@/lib/catalog/types";
import type { ClimateChoice, LuggagePlan, TravelType } from "@/lib/rules/generator";

export function PreviewPanel() {
  const catalog = useCatalog();
  const [input, setInput] = useState<CatalogPreviewInput>({
    country: "日本",
    days: 5,
    travelType: "city",
    luggage: "checked",
    climate: "auto",
  });
  const result = useMemo(() => (catalog ? previewCatalog(catalog, input) : null), [catalog, input]);

  if (!catalog) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-black">營運預覽</h2>
      <p className="text-sm text-[var(--ink-soft)]">模擬會生出哪些包與物品。不是旅人 App 畫面。</p>
      <label className="wire-field">
        國家／地區
        <input
          value={input.country}
          onChange={(event) => setInput({ ...input, country: event.target.value })}
          placeholder="日本"
        />
      </label>
      <label className="wire-field">
        天數
        <input
          type="number"
          min={1}
          value={input.days}
          onChange={(event) => setInput({ ...input, days: Math.max(1, Number(event.target.value) || 1) })}
        />
      </label>
      <label className="wire-field">
        類型
        <select
          value={input.travelType}
          onChange={(event) => setInput({ ...input, travelType: event.target.value as TravelType })}
        >
          {TRAVEL_TYPES.map((type) => (
            <option key={type.id} value={type.id}>
              {type.label}
            </option>
          ))}
        </select>
      </label>
      <label className="wire-field">
        行李
        <select
          value={input.luggage}
          onChange={(event) => setInput({ ...input, luggage: event.target.value as LuggagePlan })}
        >
          {LUGGAGE_PLANS.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.label}
            </option>
          ))}
        </select>
      </label>
      <label className="wire-field">
        氣候
        <select
          value={input.climate}
          onChange={(event) => setInput({ ...input, climate: event.target.value as ClimateChoice })}
        >
          {PREVIEW_CLIMATES.map((climate) => (
            <option key={climate.id} value={climate.id}>
              {climate.label}
            </option>
          ))}
        </select>
      </label>
      {result ? (
        <div className="wire-card flex flex-col gap-2">
          <p className="text-sm">
            {result.meta.countryCode ?? "未知國碼"} · {result.meta.international ? "出國" : "國內"} · 氣候{" "}
            {result.meta.climates.join("/") || "—"}
            {result.meta.needsAdapter ? " · 需轉接頭" : ""}
            {result.meta.highVoltage ? " · 高電壓" : ""}
          </p>
          <p className="font-bold">
            箱子：{result.preset ? `${result.preset.name}（${result.preset.bags.map((bag) => bag.name).join("、")}）` : "無對應預設"}
          </p>
          <p className="text-sm font-bold">物品 {result.items.length}</p>
          <ul className="flex flex-col gap-1">
            {result.items.map((item) => (
              <li key={item.id} className="border-b border-[var(--line)] py-2 text-sm last:border-b-0">
                <span className="font-bold">{item.name}</span>
                <span className="text-[var(--ink-soft)]"> · {categoryName(item.categoryId)}</span>
                {item.affiliateUrl ? <span className="text-[var(--accent-strong)]"> · 導購</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
