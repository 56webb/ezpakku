import type { Category } from "@/lib/types";
import type { WizardItemCtx } from "@/components/wizard/item-ctx";

export function moveCategory(ctx: WizardItemCtx, categoryId: string, direction: -1 | 1) {
  const order = [...ctx.draft.categoryOrder];
  const index = order.indexOf(categoryId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= order.length) return;
  const [removed] = order.splice(index, 1);
  order.splice(target, 0, removed);
  ctx.patch({ categoryOrder: order });
}

export function hideCategory(ctx: WizardItemCtx, categoryId: string) {
  if (ctx.categories.length <= 1) {
    ctx.patch({ error: "至少留一個分類" });
    return;
  }
  ctx.patch({
    hiddenCategoryIds: [...ctx.draft.hiddenCategoryIds, categoryId],
    selections: ctx.draft.selections.filter((selection) => selection.categoryId !== categoryId),
    error: "",
  });
}

export function addCategory(ctx: WizardItemCtx) {
  const name = ctx.draft.newCategoryName.trim();
  if (!name) {
    ctx.patch({ error: "請填分類名稱" });
    return;
  }
  const id = crypto.randomUUID();
  const category: Category = {
    id,
    name,
    isSystem: false,
    userId: ctx.userId ?? null,
    sortOrder: ctx.draft.categoryOrder.length,
  };
  ctx.patch({
    customCategories: [...ctx.draft.customCategories, category],
    categoryOrder: [...ctx.draft.categoryOrder, id],
    newCategoryName: "",
    error: "",
  });
}
