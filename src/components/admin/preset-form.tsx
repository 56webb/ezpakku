"use client";

import { useState } from "react";
import { useCatalog } from "@/hooks/use-catalog";
import { LUGGAGE_PLANS } from "@/lib/catalog/preview";
import type { CatalogBagPreset } from "@/lib/catalog/types";
import { BAG_COLORS, BAG_TYPES } from "@/lib/constants";
import type { LuggagePlan } from "@/lib/rules/generator";
import type { BagType } from "@/lib/types";
import { newId } from "@/components/admin/utils";

export function PresetForm({
  value,
  onSave,
  onCancel,
}: {
  value: CatalogBagPreset;
  onSave: (preset: CatalogBagPreset) => void;
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
          name: draft.name.trim(),
          summary: draft.summary.trim(),
        });
      }}
    >
      <label className="wire-field">
        key
        <input value={draft.key} onChange={(event) => setDraft({ ...draft, key: event.target.value })} required />
      </label>
      <label className="wire-field">
        名稱
        <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required />
      </label>
      <label className="wire-field">
        摘要
        <input value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} />
      </label>
      <label className="wire-field">
        行李方案
        <select
          value={draft.luggagePlan ?? ""}
          onChange={(event) =>
            setDraft({
              ...draft,
              luggagePlan: (event.target.value || null) as LuggagePlan | null,
            })
          }
        >
          <option value="">不限</option>
          {LUGGAGE_PLANS.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">包包</p>
          <button
            type="button"
            className="text-sm underline"
            onClick={() =>
              setDraft({
                ...draft,
                bags: [
                  ...draft.bags,
                  {
                    id: newId("bag"),
                    name: "新包包",
                    type: "suitcase",
                    color: BAG_COLORS[0],
                    kind: "other",
                    sortOrder: draft.bags.length,
                  },
                ],
              })
            }
          >
            加一包
          </button>
        </div>
        {draft.bags.map((bag, index) => (
          <div key={bag.id} className="wire-pop flex flex-col gap-2">
            <label className="wire-field">
              名稱
              <input
                value={bag.name}
                onChange={(event) => {
                  const bags = [...draft.bags];
                  bags[index] = { ...bag, name: event.target.value };
                  setDraft({ ...draft, bags });
                }}
              />
            </label>
            <label className="wire-field">
              類型
              <select
                value={bag.type}
                onChange={(event) => {
                  const bags = [...draft.bags];
                  bags[index] = { ...bag, type: event.target.value as BagType };
                  setDraft({ ...draft, bags });
                }}
              >
                {BAG_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="wire-field">
              角色
              <select
                value={bag.kind}
                onChange={(event) => {
                  const bags = [...draft.bags];
                  bags[index] = {
                    ...bag,
                    kind: event.target.value as CatalogBagPreset["bags"][number]["kind"],
                  };
                  setDraft({ ...draft, bags });
                }}
              >
                <option value="personal">隨身</option>
                <option value="carryon">登機</option>
                <option value="checked">托運</option>
                <option value="other">其他</option>
              </select>
            </label>
            <button
              type="button"
              className="text-left text-sm underline text-[var(--warn)]"
              onClick={() => setDraft({ ...draft, bags: draft.bags.filter((entry) => entry.id !== bag.id) })}
            >
              移除此包
            </button>
          </div>
        ))}
      </div>
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
