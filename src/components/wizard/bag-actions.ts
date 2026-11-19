import { bagLabel } from "@/components/ui";
import type { Draft } from "@/components/wizard/draft";
import type { WizardPatch } from "@/components/wizard/types";

export type WizardBagCtx = {
  draft: Draft;
  patch: WizardPatch;
};

export function addWornBag(ctx: WizardBagCtx) {
  ctx.patch({
    bags: [
      ...ctx.draft.bags,
      {
        localId: crypto.randomUUID(),
        name: bagLabel(ctx.draft.bagType),
        type: ctx.draft.bagType,
        color: ctx.draft.bagColor,
      },
    ],
    editingBagId: null,
    error: "",
  });
}

export function saveBag(ctx: WizardBagCtx) {
  if (!ctx.draft.bagName.trim()) {
    ctx.patch({ error: "包包要有名稱" });
    return;
  }
  const nextBag = {
    localId: ctx.draft.editingBagId ?? crypto.randomUUID(),
    name: ctx.draft.bagName.trim(),
    type: ctx.draft.bagType,
    color: ctx.draft.bagColor,
  };
  const bags = ctx.draft.editingBagId
    ? ctx.draft.bags.map((bag) => (bag.localId === ctx.draft.editingBagId ? nextBag : bag))
    : [...ctx.draft.bags, nextBag];
  ctx.patch({ bags, step: "bags", editingBagId: null, error: "" });
}

export function removeBag(ctx: WizardBagCtx, localId: string) {
  if (!window.confirm("拿掉這個包包後，裡面已選的物品會取消勾選。")) return;
  ctx.patch({
    bags: ctx.draft.bags.filter((bag) => bag.localId !== localId),
    selections: ctx.draft.selections.filter((selection) => selection.bagLocalId !== localId),
    editingBagId: ctx.draft.editingBagId === localId ? null : ctx.draft.editingBagId,
  });
}
