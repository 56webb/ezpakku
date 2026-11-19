import { resolveBagIndex } from "@/lib/bag-prefs";
import { bagPrefsForItem } from "@/lib/catalog/local";
import { systemItems } from "@/lib/seed";
import { templateItemIds } from "@/lib/templates";
import {
  selectionKey,
  type Draft,
  type DraftSelection,
} from "@/components/wizard/draft";
import type { WizardItemCtx } from "@/components/wizard/item-ctx";

export function preferredBagLocalId(draft: Draft, name: string, categoryId: string): string | null {
  if (draft.bags.length === 0) return null;
  const prefs = bagPrefsForItem(name, categoryId);
  const index = resolveBagIndex(
    prefs,
    draft.bags.map((bag) => ({ type: bag.type, name: bag.name })),
  );
  return draft.bags[index]?.localId ?? draft.bags[0]?.localId ?? null;
}

export function autoCheckRecommended(draft: Draft): DraftSelection[] {
  const ids = templateItemIds({
    location: draft.location || `${draft.country} ${draft.city}`,
    days: Number(draft.days) || 1,
    purpose: draft.purpose,
  });
  const selections: DraftSelection[] = [];
  for (const itemId of ids) {
    const item = systemItems.find((entry) => entry.id === itemId);
    if (!item) continue;
    const bagLocalId = preferredBagLocalId(draft, item.name, item.categoryId);
    if (!bagLocalId) continue;
    selections.push({
      localId: crypto.randomUUID(),
      itemId: item.id,
      customName: null,
      categoryId: item.categoryId,
      bagLocalId,
    });
  }
  return selections;
}

export function goItems(ctx: WizardItemCtx) {
  if (ctx.draft.bags.length < 1) {
    ctx.patch({ error: "至少要一個包包" });
    return;
  }
  if (ctx.draft.mode === "template" && !ctx.draft.templateApplied) {
    ctx.patch({ error: "請先產生通用範本清單" });
    return;
  }
  if (ctx.draft.mode === "detail" && ctx.draft.selections.length === 0) {
    const selections = autoCheckRecommended(ctx.draft);
    if (selections.length === 0) {
      ctx.patch({ error: "找不到可自動勾選的建議物品" });
      return;
    }
    ctx.patch({ step: "items", selections, error: "" });
    return;
  }
  ctx.patch({ step: "items", error: "" });
}

export function assignBag(ctx: WizardItemCtx, bagLocalId: string) {
  const { draft, patch } = ctx;
  if (draft.batch) {
    if (draft.batchSelected.length === 0) {
      patch({ error: "請先勾選物品" });
      return;
    }
    const selections = draft.selections.map((selection) =>
      draft.batchSelected.includes(selectionKey(selection))
        ? { ...selection, bagLocalId }
        : selection,
    );
    for (const key of draft.batchSelected) {
      if (!key.startsWith("item:")) continue;
      const itemId = key.slice(5);
      if (selections.some((selection) => selection.itemId === itemId)) continue;
      const item = systemItems.find((entry) => entry.id === itemId);
      if (!item) continue;
      selections.push({
        localId: crypto.randomUUID(),
        itemId,
        customName: null,
        categoryId: item.categoryId,
        bagLocalId,
      });
    }
    patch({ selections, batch: false, batchSelected: [], pendingKey: null, error: "" });
    return;
  }

  if (draft.pendingKey?.startsWith("item:")) {
    const itemId = draft.pendingKey.slice(5);
    const item = systemItems.find((entry) => entry.id === itemId);
    if (!item) return;
    patch({
      selections: [
        ...draft.selections,
        {
          localId: crypto.randomUUID(),
          itemId,
          customName: null,
          categoryId: item.categoryId,
          bagLocalId,
        },
      ],
      pendingKey: null,
      error: "",
    });
    return;
  }

  if (draft.pendingKey?.startsWith("custom:")) {
    const [name, categoryId] = draft.pendingKey.slice(7).split("@@");
    patch({
      selections: [
        ...draft.selections,
        {
          localId: crypto.randomUUID(),
          itemId: null,
          customName: name,
          categoryId,
          bagLocalId,
        },
      ],
      pendingKey: null,
      customItemName: "",
      error: "",
    });
    return;
  }

  if (draft.rebindingId) {
    patch({
      selections: draft.selections.map((selection) =>
        selection.localId === draft.rebindingId ? { ...selection, bagLocalId } : selection,
      ),
      rebindingId: null,
      error: "",
    });
  }
}

export function toggleItem(ctx: WizardItemCtx, itemId: string) {
  const { draft, patch } = ctx;
  if (draft.pendingKey) {
    patch({ error: "請先把正在分配的物品放進包包" });
    return;
  }
  const key = `item:${itemId}`;
  if (draft.batch) {
    const batchSelected = draft.batchSelected.includes(key)
      ? draft.batchSelected.filter((entry) => entry !== key)
      : [...draft.batchSelected, key];
    patch({ batchSelected, error: "" });
    return;
  }
  const existing = draft.selections.find((selection) => selection.itemId === itemId);
  if (existing) {
    patch({
      selections: draft.selections.filter((selection) => selection.localId !== existing.localId),
      rebindingId: draft.rebindingId === existing.localId ? null : draft.rebindingId,
      error: "",
    });
    return;
  }
  const item = systemItems.find((entry) => entry.id === itemId);
  if (!item) return;
  const bagLocalId = preferredBagLocalId(draft, item.name, item.categoryId);
  if (!bagLocalId) {
    patch({ error: "請先新增至少一個包包" });
    return;
  }
  patch({
    selections: [
      ...draft.selections,
      {
        localId: crypto.randomUUID(),
        itemId,
        customName: null,
        categoryId: item.categoryId,
        bagLocalId,
      },
    ],
    pendingKey: null,
    rebindingId: null,
    error: "",
  });
}

export function addCustom(ctx: WizardItemCtx) {
  const { draft, patch } = ctx;
  const name = draft.customItemName.trim();
  if (!name) {
    patch({ error: "請填自訂物品名稱" });
    return;
  }
  if (draft.pendingKey) {
    patch({ error: "請先把正在分配的物品放進包包" });
    return;
  }
  const bagLocalId = preferredBagLocalId(draft, name, draft.customItemCategoryId);
  if (!bagLocalId) {
    patch({ error: "請先新增至少一個包包" });
    return;
  }
  patch({
    selections: [
      ...draft.selections,
      {
        localId: crypto.randomUUID(),
        itemId: null,
        customName: name,
        categoryId: draft.customItemCategoryId,
        bagLocalId,
      },
    ],
    pendingKey: null,
    customItemName: "",
    rebindingId: null,
    error: "",
  });
}
