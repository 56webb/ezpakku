"use client";

import { useState } from "react";
import { useCatalog, useCatalogActions } from "@/hooks/use-catalog";
import type { CatalogBagPreset } from "@/lib/catalog/types";
import { BAG_COLORS } from "@/lib/constants";
import { newId } from "@/components/admin/utils";
import { PresetForm } from "@/components/admin/preset-form";

export function PresetsPanel({ onNotice }: { onNotice: (text: string) => void }) {
  const catalog = useCatalog();
  const actions = useCatalogActions();
  const [editing, setEditing] = useState<CatalogBagPreset | null>(null);
  if (!catalog) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-black">預設箱子 {catalog.presets.length}</h2>
        <button
          type="button"
          className="wire-btn wire-btn-primary px-3 py-2 text-sm"
          onClick={() =>
            setEditing({
              id: newId("preset"),
              key: "",
              name: "",
              summary: "",
              luggagePlan: "checked",
              isActive: true,
              sortOrder: catalog.presets.length,
              bags: [
                {
                  id: newId("bag"),
                  name: "隨身包包",
                  type: "backpack",
                  color: BAG_COLORS[5],
                  kind: "personal",
                  sortOrder: 0,
                },
              ],
            })
          }
        >
          新增
        </button>
      </div>
      {editing ? (
        <PresetForm
          value={editing}
          onCancel={() => setEditing(null)}
          onSave={(preset) => {
            if (!preset.key.trim() || !preset.name.trim()) {
              onNotice("key／名稱不能空白");
              return;
            }
            actions.upsertPreset(preset);
            setEditing(null);
            onNotice("預設箱子已儲存");
          }}
        />
      ) : null}
      <ul className="flex flex-col gap-2">
        {catalog.presets.map((preset) => (
          <li key={preset.id} className="wire-card">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold">
                  {preset.name}
                  {!preset.isActive ? <span className="ml-2 text-xs text-[var(--warn)]">停用</span> : null}
                </p>
                <p className="text-xs text-[var(--ink-soft)]">
                  {preset.key} · {preset.luggagePlan ?? "不限行李"} · {preset.bags.length} 個包
                </p>
                <p className="text-sm">{preset.summary}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="text-sm underline" onClick={() => setEditing(preset)}>
                  編輯
                </button>
                <button
                  type="button"
                  className="text-sm underline text-[var(--warn)]"
                  onClick={() => {
                    actions.removePreset(preset.id);
                    onNotice(`已刪 ${preset.name}`);
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
