import countriesData from "@/data/countries-rules.json";
import itemsData from "@/data/items-rules.json";
import safetyData from "@/data/safety-rules.json";
import { BAG_COLORS } from "@/lib/constants";
import { categoryIds } from "@/lib/seed";
import type { BagType } from "@/lib/types";

export type TravelType = "city" | "beach" | "ski" | "business" | "kids";
export type LuggagePlan = "carryon7" | "checked";
export type ClimateChoice = "auto" | "hot" | "warm" | "cool" | "cold";

export type RuleCountry = {
  code: string;
  name: string;
  city: string;
  plugs: string[];
  voltage: string;
  international: boolean;
  meanTempC: (number | null)[];
};

export type SafetyTag = {
  icon: string;
  label: string;
  title: string;
  detail: string;
  forbidChecked: boolean;
  internationalOnly?: boolean;
  sources: { name: string; url: string }[];
};

type QtySpec = number | { perDay?: number; extra?: number; min?: number; max?: number };

type RuleItem = {
  id: string;
  name: { "zh-tw": string };
  category: string;
  qty?: QtySpec;
  bag?: "personal" | "main";
  when?: {
    international?: boolean;
    climate?: ClimateChoice[];
    types?: TravelType[];
    luggage?: LuggagePlan[];
    needsAdapter?: boolean;
    highVoltage?: boolean;
    minDays?: number;
  };
  note?: { "zh-tw": string };
  tags?: string[];
  buyKey?: string;
};

const TAIWAN_PLUGS = ["A", "B"];

const CATEGORY_MAP: Record<string, string> = {
  docs: categoryIds.docs,
  clothes: categoryIds.clothes,
  toiletries: categoryIds.toiletry,
  electronics: categoryIds.electronics,
  health: categoryIds.health,
  misc: categoryIds.misc,
  beach: categoryIds.misc,
  ski: categoryIds.misc,
  business: categoryIds.misc,
  kids: categoryIds.misc,
  custom: categoryIds.misc,
};

/** 地圖國家名 → 規則引擎國碼。找不到就當其他出國。 */
const NAME_TO_CODE: Record<string, string> = {
  台灣: "TW",
  日本: "JP",
  韓國: "KR",
  香港: "HK",
  澳門: "MO",
  中國: "CN",
  泰國: "TH",
  越南: "VN",
  新加坡: "SG",
  馬來西亞: "MY",
  印尼: "ID",
  菲律賓: "PH",
  美國: "US",
  加拿大: "CA",
  英國: "GB",
  法國: "FR",
  義大利: "IT",
  西班牙: "ES",
  德國: "DE",
  荷蘭: "NL",
  瑞士: "CH",
  奧地利: "AT",
  澳洲: "AU",
  紐西蘭: "NZ",
  冰島: "IS",
  土耳其: "TR",
  阿聯酋: "AE",
  埃及: "EG",
  墨西哥: "MX",
  巴西: "BR",
};

export const RULE_COUNTRIES = countriesData.countries as RuleCountry[];

export const SAFETY_TAGS: Record<string, SafetyTag> = Object.fromEntries(
  Object.entries(safetyData.tags as Record<string, {
    icon: string;
    label: { "zh-tw": string };
    title: { "zh-tw": string };
    detail: { "zh-tw": string };
    forbidChecked: boolean;
    internationalOnly?: boolean;
    sources: { name: { "zh-tw": string }; url: string }[];
  }>).map(([id, tag]) => [
    id,
    {
      icon: tag.icon,
      label: tag.label["zh-tw"],
      title: tag.title["zh-tw"],
      detail: tag.detail["zh-tw"],
      forbidChecked: tag.forbidChecked,
      internationalOnly: tag.internationalOnly,
      sources: tag.sources.map((source) => ({ name: source.name["zh-tw"], url: source.url })),
    },
  ]),
);

export const TRAVEL_TYPES: { id: TravelType; label: string }[] = [
  { id: "city", label: "城市" },
  { id: "beach", label: "海島" },
  { id: "ski", label: "滑雪" },
  { id: "business", label: "出差" },
  { id: "kids", label: "帶小孩" },
];

export const LUGGAGE_PLANS: { id: LuggagePlan; label: string }[] = [
  { id: "carryon7", label: "廉航 7kg 登機" },
  { id: "checked", label: "有托運行李箱" },
];

export function countryCodeFromName(countryName: string): string | null {
  const trimmed = countryName.trim();
  if (!trimmed) return null;
  if (NAME_TO_CODE[trimmed]) return NAME_TO_CODE[trimmed];
  const found = RULE_COUNTRIES.find((country) => country.name.startsWith(trimmed) || trimmed.startsWith(country.name.replace(/（.*）/, "")));
  return found?.code ?? null;
}

export function getCountry(code: string | null | undefined): RuleCountry | null {
  if (!code) return null;
  return RULE_COUNTRIES.find((country) => country.code === code) ?? null;
}

export function tempToClimate(temp: number): Exclude<ClimateChoice, "auto"> {
  if (temp >= 25) return "hot";
  if (temp >= 18) return "warm";
  if (temp >= 10) return "cool";
  return "cold";
}

export function tripMonths(startDate: string, days: number): number[] {
  const start = startDate ? new Date(`${startDate}T00:00:00`) : new Date();
  if (Number.isNaN(start.getTime())) return [new Date().getMonth() + 1];
  const months = new Set<number>();
  for (let offset = 0; offset < Math.max(1, days); offset += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + offset);
    months.add(day.getMonth() + 1);
  }
  return [...months];
}

export function tripClimate(input: {
  startDate: string;
  days: number;
  climate: ClimateChoice;
  countryCode: string | null;
}): { climates: Exclude<ClimateChoice, "auto">[]; avgTemps: number[]; months: number[] } {
  const months = tripMonths(input.startDate, input.days);
  if (input.climate !== "auto") return { climates: [input.climate], avgTemps: [], months };
  const country = getCountry(input.countryCode);
  const temps = country?.meanTempC
    ? months.map((month) => country.meanTempC[month - 1]).filter((value): value is number => value != null)
    : [];
  if (temps.length === 0) return { climates: [], avgTemps: [], months };
  return { climates: [...new Set(temps.map(tempToClimate))], avgTemps: temps, months };
}

export function needsAdapter(country: RuleCountry | null): boolean {
  if (!country?.plugs?.length) return false;
  return !country.plugs.some((plug) => TAIWAN_PLUGS.includes(plug));
}

export function isHighVoltage(country: RuleCountry | null): boolean {
  const voltage = Number.parseInt(country?.voltage ?? "", 10);
  return Number.isFinite(voltage) && voltage >= 200;
}

export function calcQty(qty: QtySpec | undefined, days: number): number {
  if (qty == null) return 1;
  if (typeof qty === "number") return qty;
  const raw = Math.ceil(days * (qty.perDay ?? 0) + (qty.extra ?? 0));
  return Math.min(qty.max ?? 99, Math.max(qty.min ?? 1, raw));
}

function matches(
  when: RuleItem["when"] = {},
  ctx: {
    international: boolean;
    climates: string[];
    types: TravelType[];
    luggage: LuggagePlan;
    needsAdapter: boolean;
    highVoltage: boolean;
    days: number;
  },
): boolean {
  if (when.international != null && when.international !== ctx.international) return false;
  if (when.climate && !when.climate.some((climate) => ctx.climates.includes(climate))) return false;
  if (when.types && !when.types.some((type) => ctx.types.includes(type))) return false;
  if (when.luggage && !when.luggage.includes(ctx.luggage)) return false;
  if (when.needsAdapter && !ctx.needsAdapter) return false;
  if (when.highVoltage && !ctx.highVoltage) return false;
  if (when.minDays && ctx.days < when.minDays) return false;
  return true;
}

export type GeneratedPacking = {
  bags: { name: string; type: BagType; color: string; kind: "personal" | "carryon" | "checked" }[];
  items: {
    customName: string;
    categoryId: string;
    bagIndex: number;
    qty: number;
    tags: string[];
    note: string;
    templateId: string;
  }[];
  meta: {
    countryCode: string | null;
    climates: string[];
    needsAdapter: boolean;
    highVoltage: boolean;
    international: boolean;
  };
};

export function generatePackingList(form: {
  countryName: string;
  startDate: string;
  days: number;
  types: TravelType[];
  luggage: LuggagePlan;
  climate?: ClimateChoice;
}): GeneratedPacking {
  const countryCode = countryCodeFromName(form.countryName);
  const country = getCountry(countryCode);
  const days = Math.max(1, Math.min(90, Number(form.days) || 1));
  const climate = form.climate ?? "auto";
  const { climates } = tripClimate({ startDate: form.startDate, days, climate, countryCode });
  const ctx = {
    international: country ? country.international : true,
    climates,
    types: form.types.length ? form.types : (["city"] as TravelType[]),
    luggage: form.luggage,
    needsAdapter: needsAdapter(country),
    highVoltage: isHighVoltage(country),
    days,
  };

  const personal = {
    name: "隨身包包",
    type: "backpack" as BagType,
    color: BAG_COLORS[5],
    kind: "personal" as const,
  };
  const main =
    form.luggage === "carryon7"
      ? { name: "登機箱", type: "suitcase" as BagType, color: BAG_COLORS[0], kind: "carryon" as const }
      : { name: "托運行李箱", type: "suitcase" as BagType, color: BAG_COLORS[0], kind: "checked" as const };
  const bags = [personal, main];

  const items: GeneratedPacking["items"] = [];
  for (const [index, tpl] of (itemsData.items as RuleItem[]).entries()) {
    if (!matches(tpl.when, ctx)) continue;
    const forbid = (tpl.tags ?? []).some((tag) => SAFETY_TAGS[tag]?.forbidChecked);
    const bagIndex = tpl.bag === "personal" || forbid ? 0 : 1;
    const tags = (tpl.tags ?? []).filter((tag) => !(SAFETY_TAGS[tag]?.internationalOnly && !ctx.international));
    let note = tpl.note?.["zh-tw"] ?? "";
    if (tpl.id === "adapter" && country) {
      note = `當地插頭 ${country.plugs.join("/")}、電壓 ${country.voltage}`;
    }
    const qty = calcQty(tpl.qty, Math.min(days, 7));
    const label = tpl.name["zh-tw"];
    items.push({
      customName: qty > 1 ? `${label} ×${qty}` : label,
      categoryId: CATEGORY_MAP[tpl.category] ?? categoryIds.misc,
      bagIndex,
      qty,
      tags,
      note,
      templateId: tpl.id,
    });
    void index;
  }

  return {
    bags,
    items,
    meta: {
      countryCode,
      climates,
      needsAdapter: ctx.needsAdapter,
      highVoltage: ctx.highVoltage,
      international: ctx.international,
    },
  };
}

/** 托運類包包：種類是行李箱，且名稱含托運／或產生器標成 checked。 */
export function isCheckedBag(bag: { name: string; type: BagType; kind?: string }): boolean {
  if (bag.kind === "checked") return true;
  if (bag.kind === "personal" || bag.kind === "carryon") return false;
  return bag.type === "suitcase" && /托運/.test(bag.name);
}

export function packingWarnings(
  bags: { id: string; name: string; type: BagType }[],
  items: { bagId: string; tags?: string[] }[],
): { bagId: string; bagName: string; itemTags: string[] }[] {
  const checkedIds = new Set(bags.filter((bag) => isCheckedBag(bag)).map((bag) => bag.id));
  const warnings: { bagId: string; bagName: string; itemTags: string[] }[] = [];
  for (const bag of bags) {
    if (!checkedIds.has(bag.id)) continue;
    const forbidden = new Set<string>();
    for (const item of items) {
      if (item.bagId !== bag.id) continue;
      for (const tag of item.tags ?? []) {
        if (SAFETY_TAGS[tag]?.forbidChecked) forbidden.add(tag);
      }
    }
    if (forbidden.size) {
      warnings.push({ bagId: bag.id, bagName: bag.name, itemTags: [...forbidden] });
    }
  }
  return warnings;
}
