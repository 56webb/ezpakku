import safetyData from "@/data/safety-rules.json";
import { BAG_COLORS } from "@/lib/constants";
import { systemCategories, systemItems } from "@/lib/seed";
import type {
  CatalogAffiliate,
  CatalogBagPreset,
  CatalogItemRow,
  CatalogItemRule,
  CatalogSafetyTag,
  CatalogState,
} from "@/lib/catalog/types";

export const CATALOG_KEY = "ezpakku-catalog-v1";

type Listener = () => void;

let snapshot: CatalogState | null = null;
let booted = false;
let bootScheduled = false;
const listeners = new Set<Listener>();

function defaultAffiliates(): CatalogAffiliate[] {
  return [
    { id: "aff-sunscreen", key: "sunscreen", label: "防曬示意", url: "https://example.com/go/sunscreen", platform: "example", isActive: true },
    { id: "aff-charger", key: "charger", label: "充電器示意", url: "https://example.com/go/charger", platform: "example", isActive: true },
    { id: "aff-powerbank", key: "powerbank", label: "行動電源示意", url: "https://example.com/go/powerbank", platform: "example", isActive: true },
    { id: "aff-passport", key: "passport", label: "護照示意", url: "https://example.com/go/passport", platform: "example", isActive: true },
  ];
}

function defaultItems(): CatalogItemRow[] {
  const byKey: Record<string, string> = {
    防曬: "sunscreen",
    手機充電器: "charger",
    行動電源: "powerbank",
    護照: "passport",
  };
  const affiliates = defaultAffiliates();
  return systemItems.map((item, index) => {
    const key = byKey[item.name] ?? null;
    const affiliate = key ? affiliates.find((entry) => entry.key === key) ?? null : null;
    return {
      id: item.id,
      categoryId: item.categoryId,
      name: item.name,
      description: item.description,
      templateKey: key,
      defaultBag: item.name === "護照" || item.name === "行動電源" || item.name === "手機充電器" ? "personal" : "main",
      tags: item.name === "行動電源" ? ["powerbank"] : [],
      note: "",
      affiliateId: affiliate?.id ?? null,
      affiliateUrl: item.affiliateUrl,
      isActive: item.isActive,
      sortOrder: index,
    };
  });
}

function defaultPresets(): CatalogBagPreset[] {
  return [
    {
      id: "preset-checked",
      key: "checked-standard",
      name: "托運標準組",
      summary: "隨身包＋托運行李箱",
      luggagePlan: "checked",
      isActive: true,
      sortOrder: 0,
      bags: [
        { id: "preset-checked-personal", name: "隨身包包", type: "backpack", color: BAG_COLORS[5], kind: "personal", sortOrder: 0 },
        { id: "preset-checked-main", name: "托運行李箱", type: "suitcase", color: BAG_COLORS[0], kind: "checked", sortOrder: 1 },
      ],
    },
    {
      id: "preset-carry",
      key: "carryon7",
      name: "廉航登機組",
      summary: "隨身包＋7kg 登機箱",
      luggagePlan: "carryon7",
      isActive: true,
      sortOrder: 1,
      bags: [
        { id: "preset-carry-personal", name: "隨身包包", type: "backpack", color: BAG_COLORS[5], kind: "personal", sortOrder: 0 },
        { id: "preset-carry-main", name: "登機箱", type: "suitcase", color: BAG_COLORS[0], kind: "carryon", sortOrder: 1 },
      ],
    },
  ];
}

function defaultSafetyTags(): CatalogSafetyTag[] {
  return Object.entries(safetyData.tags as Record<string, {
    label: { "zh-tw": string };
    title: { "zh-tw": string };
    detail: { "zh-tw": string };
    forbidChecked: boolean;
    internationalOnly?: boolean;
  }>).map(([id, tag]) => ({
    id,
    label: tag.label["zh-tw"],
    title: tag.title["zh-tw"],
    detail: tag.detail["zh-tw"],
    forbidChecked: tag.forbidChecked,
    internationalOnly: Boolean(tag.internationalOnly),
  }));
}

function defaultRules(): CatalogItemRule[] {
  const byName = Object.fromEntries(defaultItems().map((item) => [item.name, item.id]));
  const rules: CatalogItemRule[] = [];
  const push = (name: string, partial: Partial<Omit<CatalogItemRule, "itemId">>) => {
    const itemId = byName[name];
    if (!itemId) return;
    rules.push({
      itemId,
      international: partial.international ?? null,
      climates: partial.climates ?? [],
      travelTypes: partial.travelTypes ?? [],
      luggage: partial.luggage ?? [],
      needsAdapter: partial.needsAdapter ?? null,
      highVoltage: partial.highVoltage ?? null,
      minDays: partial.minDays ?? null,
    });
  };
  push("護照", { international: true });
  push("泳衣", { travelTypes: ["beach"] });
  push("保暖衣", { climates: ["cool", "cold"] });
  push("正式服裝", { travelTypes: ["business"] });
  push("一套較正式的衣服", { travelTypes: ["city", "business"] });
  push("刷毛外套", { travelTypes: ["ski"] });
  push("手套", { climates: ["cold"], travelTypes: ["ski"] });
  push("頭燈", { travelTypes: ["ski"] });
  push("筆電", { travelTypes: ["business"] });
  push("洗髮精", { minDays: 3 });
  push("洗衣袋", { minDays: 5 });
  push("備用上衣", { minDays: 5 });
  return rules;
}

export function createDefaultCatalog(): CatalogState {
  return {
    items: defaultItems(),
    affiliates: defaultAffiliates(),
    rules: defaultRules(),
    presets: defaultPresets(),
    safetyTags: defaultSafetyTags(),
    version: 1,
  };
}

function readStored(): CatalogState {
  try {
    const raw = localStorage.getItem(CATALOG_KEY);
    if (!raw) return createDefaultCatalog();
    const parsed = JSON.parse(raw) as Partial<CatalogState>;
    const base = createDefaultCatalog();
    return {
      items: Array.isArray(parsed.items) ? parsed.items : base.items,
      affiliates: Array.isArray(parsed.affiliates) ? parsed.affiliates : base.affiliates,
      rules: Array.isArray(parsed.rules) ? parsed.rules : base.rules,
      presets: Array.isArray(parsed.presets) ? parsed.presets : base.presets,
      safetyTags: Array.isArray(parsed.safetyTags) ? parsed.safetyTags : base.safetyTags,
      version: typeof parsed.version === "number" ? parsed.version : base.version,
    };
  } catch {
    return createDefaultCatalog();
  }
}

export function subscribeCatalog(listener: Listener): () => void {
  listeners.add(listener);
  if (!booted && !bootScheduled && typeof window !== "undefined") {
    bootScheduled = true;
    queueMicrotask(() => {
      if (booted) return;
      snapshot = readStored();
      booted = true;
      listeners.forEach((entry) => entry());
    });
  }
  return () => listeners.delete(listener);
}

export function getCatalogSnapshot(): CatalogState | null {
  return booted ? snapshot : null;
}

export function getCatalogServerSnapshot(): CatalogState | null {
  return null;
}

export function updateCatalog(recipe: (current: CatalogState) => CatalogState): void {
  const current = snapshot ?? readStored();
  const next = recipe(current);
  booted = true;
  if (next === current) return;
  snapshot = { ...next, version: next.version + 1 };
  localStorage.setItem(CATALOG_KEY, JSON.stringify(snapshot));
  listeners.forEach((listener) => listener());
}

export function resetCatalog(): void {
  snapshot = createDefaultCatalog();
  booted = true;
  localStorage.setItem(CATALOG_KEY, JSON.stringify(snapshot));
  listeners.forEach((listener) => listener());
}

export function categoryName(categoryId: string): string {
  return systemCategories.find((category) => category.id === categoryId)?.name ?? "未分類";
}
