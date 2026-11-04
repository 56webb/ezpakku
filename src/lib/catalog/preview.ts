import {
  countryCodeFromName,
  getCountry,
  isHighVoltage,
  LUGGAGE_PLANS,
  needsAdapter,
  TRAVEL_TYPES,
  tripClimate,
  type ClimateChoice,
  type LuggagePlan,
  type TravelType,
} from "@/lib/rules/generator";
import type {
  CatalogBagPreset,
  CatalogItemRow,
  CatalogItemRule,
  CatalogPreviewInput,
  CatalogState,
} from "@/lib/catalog/types";

function emptyRule(itemId: string): CatalogItemRule {
  return {
    itemId,
    international: null,
    climates: [],
    travelTypes: [],
    luggage: [],
    needsAdapter: null,
    highVoltage: null,
    minDays: null,
  };
}

function ruleMatches(
  rule: CatalogItemRule,
  ctx: {
    international: boolean;
    climates: string[];
    travelType: TravelType;
    luggage: LuggagePlan;
    needsAdapter: boolean;
    highVoltage: boolean;
    days: number;
  },
): boolean {
  if (rule.international != null && rule.international !== ctx.international) return false;
  if (rule.climates.length > 0 && !rule.climates.some((climate) => ctx.climates.includes(climate))) return false;
  if (rule.travelTypes.length > 0 && !rule.travelTypes.includes(ctx.travelType)) return false;
  if (rule.luggage.length > 0 && !rule.luggage.includes(ctx.luggage)) return false;
  if (rule.needsAdapter === true && !ctx.needsAdapter) return false;
  if (rule.highVoltage === true && !ctx.highVoltage) return false;
  if (rule.minDays != null && ctx.days < rule.minDays) return false;
  return true;
}

export function previewCatalog(
  catalog: CatalogState,
  input: CatalogPreviewInput,
): {
  meta: {
    countryCode: string | null;
    international: boolean;
    climates: string[];
    needsAdapter: boolean;
    highVoltage: boolean;
  };
  preset: CatalogBagPreset | null;
  items: CatalogItemRow[];
} {
  const countryCode = countryCodeFromName(input.country);
  const country = getCountry(countryCode);
  const international = country ? country.international : input.country.trim() !== "台灣" && input.country.trim() !== "";
  const climateInfo = tripClimate({
    startDate: new Date().toISOString().slice(0, 10),
    days: input.days,
    climate: input.climate,
    countryCode,
  });
  const adapter = needsAdapter(country);
  const highVoltage = isHighVoltage(country);
  const ctx = {
    international,
    climates: climateInfo.climates,
    travelType: input.travelType,
    luggage: input.luggage,
    needsAdapter: adapter,
    highVoltage,
    days: input.days,
  };

  const ruleByItem = new Map(catalog.rules.map((rule) => [rule.itemId, rule]));
  const items = catalog.items
    .filter((item) => item.isActive)
    .filter((item) => {
      const rule = ruleByItem.get(item.id) ?? emptyRule(item.id);
      // 沒有任何條件的規則＝永遠出現（系統基礎物）
      const blank =
        rule.international == null &&
        rule.climates.length === 0 &&
        rule.travelTypes.length === 0 &&
        rule.luggage.length === 0 &&
        rule.needsAdapter == null &&
        rule.highVoltage == null &&
        rule.minDays == null;
      if (blank) return true;
      return ruleMatches(rule, ctx);
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const preset =
    catalog.presets
      .filter((entry) => entry.isActive)
      .filter((entry) => entry.luggagePlan == null || entry.luggagePlan === input.luggage)
      .sort((a, b) => a.sortOrder - b.sortOrder)[0] ?? null;

  return {
    meta: {
      countryCode,
      international,
      climates: climateInfo.climates,
      needsAdapter: adapter,
      highVoltage,
    },
    preset,
    items,
  };
}

export const PREVIEW_CLIMATES: { id: ClimateChoice; label: string }[] = [
  { id: "auto", label: "自動（依國家）" },
  { id: "hot", label: "熱" },
  { id: "warm", label: "溫暖" },
  { id: "cool", label: "涼" },
  { id: "cold", label: "冷" },
];

export { TRAVEL_TYPES, LUGGAGE_PLANS };
