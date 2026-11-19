import { clearDraft } from "@/lib/browser-state";
import { isIsoDate, todayISO } from "@/lib/dates";
import { generatePackingList } from "@/lib/rules/generator";
import { systemCategories, systemItems } from "@/lib/seed";
import { matchCatalogItemId } from "@/lib/templates";
import type { TripPreset } from "@/lib/trip-presets";
import type { Category, NewJourneyInput, Result } from "@/lib/types";
import {
  previousStep,
  type Draft,
  type DraftSelection,
} from "@/components/wizard/draft";
import type { WizardPatch } from "@/components/wizard/types";

export type WizardFlowCtx = {
  draft: Draft;
  patch: WizardPatch;
  categories: Category[];
  userId: string | null | undefined;
  commit: (input: NewJourneyInput) => Result<{ state: unknown; id: string }>;
  routerPush: (href: string) => void;
};

export function abandonWizard(ctx: WizardFlowCtx) {
  if (!window.confirm("要放棄這份還沒完成的清單嗎？")) return;
  clearDraft();
  ctx.routerPush("/");
}

export function goBack(ctx: WizardFlowCtx) {
  const prev = previousStep(ctx.draft);
  if (!prev) return;
  ctx.patch({ step: prev, error: "", editingBagId: null });
}

export function lockMode(ctx: WizardFlowCtx) {
  if (!ctx.draft.mode) {
    ctx.patch({ error: "請先選一種模式" });
    return;
  }
  ctx.patch({ modeLocked: true, step: "map", startDate: ctx.draft.startDate || todayISO(), error: "" });
}

export function saveBasics(ctx: WizardFlowCtx) {
  const days = Number(ctx.draft.days);
  const country = ctx.draft.country.trim();
  const city = ctx.draft.city.trim();
  if (!country) {
    ctx.patch({ error: "請填國家" });
    return;
  }
  if (!city) {
    ctx.patch({ error: "請填城市" });
    return;
  }
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    ctx.patch({ error: "天數要是 1 到 365 的整數" });
    return;
  }
  if (!isIsoDate(ctx.draft.startDate)) {
    ctx.patch({ error: "請選出發日" });
    return;
  }
  ctx.patch({
    location: `${country} ${city}`,
    step: ctx.draft.mode === "template" ? "preset" : "bags",
    error: "",
  });
}

export function saveMap(ctx: WizardFlowCtx) {
  const country = ctx.draft.country.trim();
  const city = ctx.draft.city.trim();
  if (!country) {
    ctx.patch({ error: "請在地圖上點一個地點，或手動填國家" });
    return;
  }
  if (!city) {
    ctx.patch({ error: "請在地圖上點一個地點，或手動填城市" });
    return;
  }
  ctx.patch({
    country,
    city,
    location: `${country} ${city}`,
    step: "basics",
    error: "",
  });
}

export function applyPreset(ctx: WizardFlowCtx, preset: TripPreset) {
  const bags = preset.bags.map((bag) => ({
    localId: crypto.randomUUID(),
    name: bag.name,
    type: bag.type,
    color: bag.color,
    itemIds: bag.itemIds,
  }));
  ctx.patch({
    presetId: preset.id,
    country: ctx.draft.country.trim() || preset.country,
    days: String(preset.days),
    location: `${ctx.draft.country.trim() || preset.country} ${ctx.draft.city.trim()}`,
    bags: bags.map(({ localId, name, type, color }) => ({ localId, name, type, color })),
    selections: bags.flatMap((bag) =>
      bag.itemIds.map((itemId) => ({
        localId: crypto.randomUUID(),
        itemId,
        customName: null,
        categoryId: systemItems.find((item) => item.id === itemId)?.categoryId ?? systemCategories[0].id,
        bagLocalId: bag.localId,
      })),
    ),
    templateApplied: true,
    step: "bags",
    error: "",
  });
}

export function applyGenerated(ctx: WizardFlowCtx) {
  const days = Number(ctx.draft.days);
  if (!Number.isInteger(days) || days < 1) {
    ctx.patch({ error: "請先確認天數" });
    return;
  }
  if (ctx.draft.travelTypes.length === 0) {
    ctx.patch({ error: "至少選一種旅行類型" });
    return;
  }
  const generated = generatePackingList({
    countryName: ctx.draft.country.trim(),
    startDate: ctx.draft.startDate,
    days,
    types: ctx.draft.travelTypes,
    luggage: ctx.draft.luggage,
    climate: ctx.draft.weatherClimate || "auto",
  });
  const bags = generated.bags.map((bag) => ({
    localId: crypto.randomUUID(),
    name: bag.name,
    type: bag.type,
    color: bag.color,
  }));
  const usedItemIds = new Set<string>();
  const selections: DraftSelection[] = [];
  for (const item of generated.items) {
    const matchedId = matchCatalogItemId(item.customName, item.categoryId, systemItems);
    if (matchedId && usedItemIds.has(matchedId)) {
      continue;
    }
    if (matchedId) usedItemIds.add(matchedId);
    selections.push({
      localId: crypto.randomUUID(),
      itemId: matchedId,
      customName: matchedId ? null : item.customName,
      categoryId: matchedId
        ? systemItems.find((entry) => entry.id === matchedId)?.categoryId ?? item.categoryId
        : item.categoryId,
      bagLocalId: bags[item.bagIndex]?.localId ?? bags[0].localId,
      tags: item.tags,
      note: item.note,
    });
  }
  ctx.patch({
    presetId: "rules-engine",
    bags,
    selections,
    templateApplied: true,
    step: "bags",
    error: "",
  });
}

export function finish(ctx: WizardFlowCtx) {
  if (!ctx.draft.mode || !ctx.userId) return;
  const visibleCategoryIds = new Set(ctx.categories.map((category) => category.id));
  const items = ctx.draft.selections
    .filter((selection) => visibleCategoryIds.has(selection.categoryId))
    .map((selection) => ({
      itemId: selection.itemId,
      customName: selection.customName,
      categoryId: selection.categoryId,
      bagIndex: ctx.draft.bags.findIndex((bag) => bag.localId === selection.bagLocalId),
      tags: selection.tags ?? [],
      note: selection.note ?? "",
    }));
  const result = ctx.commit({
    mode: ctx.draft.mode,
    location: ctx.draft.location,
    days: Number(ctx.draft.days),
    purpose: ctx.draft.purpose,
    name: ctx.draft.name,
    startDate: ctx.draft.startDate,
    bags: ctx.draft.bags.map((bag) => ({ name: bag.name, type: bag.type, color: bag.color })),
    categories: ctx.categories.map((category, index) => ({
      id: category.id,
      name: category.name,
      isSystem: category.isSystem,
      sortOrder: index,
      collapseChecked: ctx.draft.collapsedCategoryIds.includes(category.id),
    })),
    items,
  });
  if (!result.ok) {
    ctx.patch({ error: result.reason });
    return;
  }
  clearDraft();
  ctx.routerPush("/");
}
