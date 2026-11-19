"use client";

import { useState } from "react";
import { useCatalog, useCatalogActions } from "@/hooks/use-catalog";
import type { CatalogAffiliate } from "@/lib/catalog/types";
import { newId } from "@/components/admin/utils";

export function AffiliatesPanel({ onNotice }: { onNotice: (text: string) => void }) {
  const catalog = useCatalog();
  const actions = useCatalogActions();
  const [editing, setEditing] = useState<CatalogAffiliate | null>(null);
  if (!catalog) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-black">業配 {catalog.affiliates.length}</h2>
        <button
          type="button"
          className="wire-btn wire-btn-primary px-3 py-2 text-sm"
          onClick={() =>
            setEditing({
              id: newId("aff"),
              key: "",
              label: "",
              url: "https://",
              platform: "",
              isActive: true,
            })
          }
        >
          新增
        </button>
      </div>
      {editing ? (
        <AffiliateForm
          value={editing}
          onCancel={() => setEditing(null)}
          onSave={(affiliate) => {
            if (!affiliate.key.trim() || !affiliate.label.trim() || !affiliate.url.trim()) {
              onNotice("key／名稱／網址都不能空白");
              return;
            }
            actions.upsertAffiliate(affiliate);
            setEditing(null);
            onNotice("業配已儲存");
          }}
        />
      ) : null}
      <ul className="flex flex-col gap-2">
        {catalog.affiliates.map((affiliate) => (
          <li key={affiliate.id} className="wire-card">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold">
                  {affiliate.label}
                  {!affiliate.isActive ? <span className="ml-2 text-xs text-[var(--warn)]">停用</span> : null}
                </p>
                <p className="text-xs text-[var(--ink-soft)]">
                  {affiliate.key} · {affiliate.platform || "未填平台"}
                </p>
                <a className="break-all text-sm underline" href={affiliate.url} target="_blank" rel="noreferrer">
                  {affiliate.url}
                </a>
              </div>
              <div className="flex gap-2">
                <button type="button" className="text-sm underline" onClick={() => setEditing(affiliate)}>
                  編輯
                </button>
                <button
                  type="button"
                  className="text-sm underline text-[var(--warn)]"
                  onClick={() => {
                    actions.removeAffiliate(affiliate.id);
                    onNotice(`已刪 ${affiliate.label}`);
                  }}
                >
                  刪
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AffiliateForm({
  value,
  onSave,
  onCancel,
}: {
  value: CatalogAffiliate;
  onSave: (affiliate: CatalogAffiliate) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <form
      className="wire-card flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({
          ...draft,
          key: draft.key.trim(),
          label: draft.label.trim(),
          url: draft.url.trim(),
          platform: draft.platform.trim(),
        });
      }}
    >
      <label className="wire-field">
        key
        <input value={draft.key} onChange={(event) => setDraft({ ...draft, key: event.target.value })} required />
      </label>
      <label className="wire-field">
        顯示名稱
        <input value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} required />
      </label>
      <label className="wire-field">
        網址
        <input value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} required />
      </label>
      <label className="wire-field">
        平台
        <input
          value={draft.platform}
          onChange={(event) => setDraft({ ...draft, platform: event.target.value })}
          placeholder="shopee / momo / amazon"
        />
      </label>
      <label className="flex items-center gap-2 text-sm font-bold">
        <input
          type="checkbox"
          checked={draft.isActive}
          onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })}
        />
        啟用
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
