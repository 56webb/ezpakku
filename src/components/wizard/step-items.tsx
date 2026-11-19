"use client";

import { BagPicker } from "@/components/ui";
import { selectionKey } from "@/components/wizard/draft";
import { systemItems } from "@/lib/seed";
import type { Category } from "@/lib/types";
import type { Draft } from "@/components/wizard/draft";
import type { WizardPatch } from "@/components/wizard/types";

type Props = {
  draft: Draft;
  patch: WizardPatch;
  categories: Category[];
  toggleItem: (itemId: string) => void;
  assignBag: (bagLocalId: string) => void;
  moveCategory: (categoryId: string, direction: -1 | 1) => void;
  hideCategory: (categoryId: string) => void;
  addCategory: () => void;
  addCustom: () => void;
  goBack: () => void;
};

export function StepItems({ draft, patch, categories, toggleItem, assignBag, moveCategory, hideCategory, addCategory, addCustom, goBack }: Props) {
  return (
    <>

    <div className="flex gap-2">
      <button
        type="button"
        data-testid="batch-toggle"
        className="wire-btn"
        onClick={() => {
          if (draft.pendingKey) {
            patch({ error: "請先把正在分配的物品放進包包" });
            return;
          }
          patch({ batch: !draft.batch, batchSelected: [], rebindingId: null, error: "" });
        }}
      >
        {draft.batch ? "取消選取" : "選取"}
      </button>
    </div>
    {draft.mode === "template" ? (
      <p className="text-sm">已依通用範本自動勾選並分袋，可再改或加。</p>
    ) : (
      <p className="text-sm">已依建議清單自動勾選並分袋，可再改或加。</p>
    )}
    {draft.batch && (
      <div>
        <p className="text-sm font-bold">已選 {draft.batchSelected.length} 項。點包包會覆蓋原本的分配。</p>
        <BagPicker
          bags={draft.bags.map((bag) => ({ id: bag.localId, name: bag.name, type: bag.type, color: bag.color }))}
          onPick={assignBag}
        />
      </div>
    )}
    {categories.map((category) => {
      const rows = [
        ...systemItems
          .filter((item) => item.categoryId === category.id)
          .map((item) => ({
            key: `item:${item.id}`,
            label: item.name,
            itemId: item.id,
            selection: draft.selections.find((selection) => selection.itemId === item.id) ?? null,
          })),
        ...draft.selections
          .filter((selection) => selection.customName && selection.categoryId === category.id)
          .map((selection) => ({
            key: `custom-row:${selection.localId}`,
            label: selection.customName ?? "",
            itemId: null as string | null,
            selection,
          })),
      ];
      const collapsed = draft.collapsedCategoryIds.includes(category.id);
      const visibleRows = collapsed ? rows.filter((row) => !row.selection) : rows;
      return (
        <section key={category.id}>
          <div className="category-head">
            <h2 className="font-black">{category.name}</h2>
            <button type="button" className="text-xs underline" onClick={() => moveCategory(category.id, -1)}>上移</button>
            <button type="button" className="text-xs underline" onClick={() => moveCategory(category.id, 1)}>下移</button>
            <button
              type="button"
              className="text-xs underline"
              onClick={() =>
                patch({
                  collapsedCategoryIds: collapsed
                    ? draft.collapsedCategoryIds.filter((id) => id !== category.id)
                    : [...draft.collapsedCategoryIds, category.id],
                })
              }
            >
              {collapsed ? "展開已勾" : "折疊已勾"}
            </button>
            <button type="button" className="text-xs underline" onClick={() => hideCategory(category.id)}>移出</button>
          </div>
          {collapsed && <p className="px-4 py-2 text-xs">已折疊 {rows.length - visibleRows.length} 項</p>}
          <ul>
            {visibleRows.map((row) => {
              const checked = Boolean(row.selection) || draft.pendingKey === `item:${row.itemId}`;
              const batchOn = draft.batchSelected.includes(row.selection ? selectionKey(row.selection) : `item:${row.itemId}`);
              return (
                <li key={row.key} className="border-b border-black/15 px-1 py-2">
                  <label className="flex items-center gap-2 font-bold">
                    <input
                      type="checkbox"
                      data-testid={row.itemId ? `item-${row.itemId}` : undefined}
                      checked={draft.batch ? batchOn : checked}
                      onChange={() => {
                        if (row.itemId) toggleItem(row.itemId);
                        else if (row.selection && draft.batch) {
                          const key = selectionKey(row.selection);
                          patch({
                            batchSelected: draft.batchSelected.includes(key)
                              ? draft.batchSelected.filter((entry) => entry !== key)
                              : [...draft.batchSelected, key],
                          });
                        } else if (row.selection) {
                          patch({
                            selections: draft.selections.filter((selection) => selection.localId !== row.selection?.localId),
                          });
                        }
                      }}
                    />
                    {row.label}
                  </label>
                  {row.selection && !draft.batch && (
                    <button
                      type="button"
                      className="mt-1 text-xs underline"
                      onClick={() => patch({ rebindingId: row.selection?.localId ?? null, pendingKey: null })}
                    >
                      已放入 {draft.bags.find((bag) => bag.localId === row.selection?.bagLocalId)?.name}
                    </button>
                  )}
                  {draft.pendingKey === `item:${row.itemId}` && (
                    <BagPicker
                      bags={draft.bags.map((bag) => ({ id: bag.localId, name: bag.name, type: bag.type, color: bag.color }))}
                      onPick={assignBag}
                    />
                  )}
                  {draft.rebindingId === row.selection?.localId && (
                    <>
                      <BagPicker
                        bags={draft.bags.map((bag) => ({ id: bag.localId, name: bag.name, type: bag.type, color: bag.color }))}
                        onPick={assignBag}
                      />
                      <button type="button" className="text-xs underline" onClick={() => patch({ rebindingId: null })}>
                        保持原包包
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      );
    })}
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        addCategory();
      }}
    >
      <label className="wire-field">
        新分類
        <input value={draft.newCategoryName} onChange={(event) => patch({ newCategoryName: event.target.value })} />
      </label>
      <button type="submit" className="wire-btn">加入分類</button>
    </form>
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        addCustom();
      }}
    >
      <label className="wire-field">
        自訂物品
        <input data-testid="field-custom-item" value={draft.customItemName} onChange={(event) => patch({ customItemName: event.target.value })} />
      </label>
      <label className="wire-field">
        分類
        <select value={draft.customItemCategoryId} onChange={(event) => patch({ customItemCategoryId: event.target.value })}>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
      </label>
      <button type="submit" className="wire-btn">加入（自動放入）</button>
    </form>
    <p className="text-xs text-[var(--ink-soft)]">
      勾選後會依志願序自動放入包包（例如衣物：行李箱 → 後揹包 → 隨身包）。要改包再點「已放入」。
    </p>
    <button type="button" className="wire-btn" data-testid="wizard-back" onClick={goBack}>
      上一步
    </button>
    <button
      type="button"
      className="wire-btn wire-btn-primary"
      onClick={() => {
        if (draft.pendingKey) {
          patch({ error: "請先把正在分配的物品放進包包" });
          return;
        }
        patch({
          step: "name",
          name: draft.name || `${draft.location.trim()}${Number(draft.days)}日行李`,
          error: "",
        });
      }}
    >
      下一步：命名
    </button>
      </>
  );
}
