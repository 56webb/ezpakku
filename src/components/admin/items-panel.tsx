"use client";

import { useState } from "react";
import { useCatalog, useCatalogActions } from "@/hooks/use-catalog";
import { categoryName } from "@/lib/catalog/local";
import type { CatalogAffiliate, CatalogItemRow } from "@/lib/catalog/types";
import { systemCategories } from "@/lib/seed";
import { newId } from "@/components/admin/utils";

export function ItemsPanel({ onNotice }: { onNotice: (text: string) => void }) {
  const catalog = useCatalog();
  const actions = useCatalogActions();
  const [editing, setEditing] = useState<CatalogItemRow | null>(null);
  if (!catalog) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-black">物品 {catalog.items.length}</h2>
        <button
          type="button"
          className="wire-btn wire-btn-primary px-3 py-2 text-sm"
          onClick={() =>
            setEditing({
              id: newId("item"),
              categoryId: systemCategories[0].id,
              name: "",
              description: "",
              templateKey: null,
              defaultBag: "main",
              bagPrefs: ["suitcase", "backpack", "sling"],
              tags: [],
              note: "",
              affiliateId: null,
              affiliateUrl: null,
              isActive: true,
              sortOrder: catalog.items.length,
            })
          }
        >
          新增
        </button>
      </div>
      {editing ? (
        <ItemForm
          value={editing}
          affiliates={catalog.affiliates}
          onCancel={() => setEditing(null)}
          onSave={(item) => {
            if (!item.name.trim()) {
              onNotice("名稱不能空白");
              return;
            }
            actions.upsertItem(item);
            setEditing(null);
            onNotice("物品已儲存");
          }}
        />
      ) : null}
      <ul className="flex flex-col gap-2">
        {catalog.items.map((item) => (
          <li key={item.id} className="wire-card flex flex-col gap-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold">
                  {item.name}
                  {!item.isActive ? <span className="ml-2 text-xs text-[var(--warn)]">下架</span> : null}
                </p>
                <p className="text-xs text-[var(--ink-soft)]">
                  {categoryName(item.categoryId)} · {item.defaultBag === "personal" ? "隨身" : "主行李"}
                  {item.affiliateUrl ? " · 有導購" : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="text-sm underline" onClick={() => setEditing(item)}>
                  編輯
                </button>
                <button
                  type="button"
                  className="text-sm underline text-[var(--warn)]"
                  onClick={() => {
                    actions.removeItem(item.id);
                    onNotice(`已刪 ${item.name}`);
                  }}
                >
                  刪
                </button>
              </div>
            </div>
            {item.description ? <p className="text-sm">{item.description}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ItemForm({
  value,
  affiliates,
  onSave,
  onCancel,
}: {
  value: CatalogItemRow;
  affiliates: CatalogAffiliate[];
  onSave: (item: CatalogItemRow) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const activeAffiliates = affiliates.filter((entry) => entry.isActive);

  return (
    <form
      className="wire-card flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const affiliate = activeAffiliates.find((entry) => entry.id === draft.affiliateId) ?? null;
        onSave({
          ...draft,
          name: draft.name.trim(),
          description: draft.description.trim(),
          note: draft.note.trim(),
          templateKey: draft.templateKey?.trim() || null,
          tags: draft.tags.filter(Boolean),
          affiliateUrl: affiliate?.url ?? draft.affiliateUrl,
        });
      }}
    >
      <label className="wire-field">
        名稱
        <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required />
      </label>
      <label className="wire-field">
        說明
        <input value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
      </label>
      <label className="wire-field">
        分類
        <select
          value={draft.categoryId}
          onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}
        >
          {systemCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <label className="wire-field">
        預設包包
        <select
          value={draft.defaultBag}
          onChange={(event) => setDraft({ ...draft, defaultBag: event.target.value as "personal" | "main" })}
        >
          <option value="personal">隨身</option>
          <option value="main">主行李</option>
        </select>
      </label>
      <label className="wire-field">
        template key
        <input
          value={draft.templateKey ?? ""}
          onChange={(event) => setDraft({ ...draft, templateKey: event.target.value })}
          placeholder="例如 passport"
        />
      </label>
      <label className="wire-field">
        標籤（逗號分隔）
        <input
          value={draft.tags.join(",")}
          onChange={(event) =>
            setDraft({
              ...draft,
              tags: event.target.value
                .split(",")
                .map((entry) => entry.trim())
                .filter(Boolean),
            })
          }
          placeholder="powerbank,liquids"
        />
      </label>
      <label className="wire-field">
        業配
        <select
          value={draft.affiliateId ?? ""}
          onChange={(event) => setDraft({ ...draft, affiliateId: event.target.value || null })}
        >
          <option value="">無</option>
          {activeAffiliates.map((affiliate) => (
            <option key={affiliate.id} value={affiliate.id}>
              {affiliate.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm font-bold">
        <input
          type="checkbox"
          checked={draft.isActive}
          onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })}
        />
        上架中
      </label>
      <div className="flex gap-2">
        <button type="submit" className="wire-btn wire-btn-primary flex-1">
          儲存
        </button>
        <button type="button" className="wire-btn flex-1" onClick={onCancel}>
          取消
        </button>
      </div>
    </form>
  );
}
