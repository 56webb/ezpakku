"use client";

import { useState } from "react";
import { useCatalog, useCatalogActions } from "@/hooks/use-catalog";
import { LUGGAGE_PLANS, PREVIEW_CLIMATES, TRAVEL_TYPES } from "@/lib/catalog/preview";
import type { CatalogItemRule } from "@/lib/catalog/types";
import { newId } from "@/components/admin/utils";

export function RulesPanel({ onNotice }: { onNotice: (text: string) => void }) {
  const catalog = useCatalog();
  const actions = useCatalogActions();
  const [itemId, setItemId] = useState("");
  if (!catalog) return null;

  const selected = catalog.items.find((item) => item.id === itemId) ?? null;
  const rule = catalog.rules.find((entry) => entry.itemId === itemId) ?? null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-black">物品規則 {catalog.rules.length}</h2>
      <p className="text-sm text-[var(--ink-soft)]">選一個物品，設定出現條件。空白條件＝永遠出現。</p>
      <label className="wire-field">
        物品
        <select value={itemId} onChange={(event) => setItemId(event.target.value)}>
          <option value="">請選擇</option>
          {catalog.items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      {selected ? (
        <RuleForm
          key={selected.id}
          itemName={selected.name}
          value={
            rule ?? {
              itemId: selected.id,
              international: null,
              climates: [],
              travelTypes: [],
              luggage: [],
              needsAdapter: null,
              highVoltage: null,
              minDays: null,
            }
          }
          onSave={(next) => {
            actions.upsertRule(next);
            onNotice(`${selected.name} 規則已儲存`);
          }}
          onClear={() => {
            actions.removeRule(selected.id);
            onNotice(`${selected.name} 規則已清除`);
          }}
        />
      ) : null}
      <ul className="flex flex-col gap-2">
        {catalog.rules.map((entry) => {
          const item = catalog.items.find((row) => row.id === entry.itemId);
          return (
            <li key={entry.itemId} className="wire-card text-sm">
              <p className="font-bold">{item?.name ?? entry.itemId}</p>
              <p className="text-[var(--ink-soft)]">{summarizeRule(entry)}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function summarizeRule(rule: CatalogItemRule): string {
  const parts: string[] = [];
  if (rule.international === true) parts.push("出國");
  if (rule.international === false) parts.push("國內");
  if (rule.climates.length) parts.push(`氣候:${rule.climates.join("/")}`);
  if (rule.travelTypes.length) parts.push(`類型:${rule.travelTypes.join("/")}`);
  if (rule.luggage.length) parts.push(`行李:${rule.luggage.join("/")}`);
  if (rule.needsAdapter === true) parts.push("需轉接頭");
  if (rule.highVoltage === true) parts.push("高電壓");
  if (rule.minDays != null) parts.push(`≥${rule.minDays}天`);
  return parts.length ? parts.join(" · ") : "無條件";
}

function RuleForm({
  itemName,
  value,
  onSave,
  onClear,
}: {
  itemName: string;
  value: CatalogItemRule;
  onSave: (rule: CatalogItemRule) => void;
  onClear: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const toggle = <T extends string>(list: T[], entry: T): T[] =>
    list.includes(entry) ? list.filter((item) => item !== entry) : [...list, entry];

  return (
    <form
      className="wire-card flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(draft);
      }}
    >
      <p className="font-bold">{itemName}</p>
      <label className="wire-field">
        出國
        <select
          value={draft.international == null ? "" : draft.international ? "yes" : "no"}
          onChange={(event) =>
            setDraft({
              ...draft,
              international: event.target.value === "" ? null : event.target.value === "yes",
            })
          }
        >
          <option value="">不限</option>
          <option value="yes">僅出國</option>
          <option value="no">僅國內</option>
        </select>
      </label>
      <fieldset className="flex flex-col gap-1">
        <legend className="text-sm font-bold">氣候</legend>
        {PREVIEW_CLIMATES.filter((entry) => entry.id !== "auto").map((climate) => (
          <label key={climate.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.climates.includes(climate.id)}
              onChange={() => setDraft({ ...draft, climates: toggle(draft.climates, climate.id) })}
            />
            {climate.label}
          </label>
        ))}
      </fieldset>
      <fieldset className="flex flex-col gap-1">
        <legend className="text-sm font-bold">旅行類型</legend>
        {TRAVEL_TYPES.map((type) => (
          <label key={type.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.travelTypes.includes(type.id)}
              onChange={() => setDraft({ ...draft, travelTypes: toggle(draft.travelTypes, type.id) })}
            />
            {type.label}
          </label>
        ))}
      </fieldset>
      <fieldset className="flex flex-col gap-1">
        <legend className="text-sm font-bold">行李</legend>
        {LUGGAGE_PLANS.map((plan) => (
          <label key={plan.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.luggage.includes(plan.id)}
              onChange={() => setDraft({ ...draft, luggage: toggle(draft.luggage, plan.id) })}
            />
            {plan.label}
          </label>
        ))}
      </fieldset>
      <label className="wire-field">
        最少天數
        <input
          type="number"
          min={0}
          value={draft.minDays ?? ""}
          onChange={(event) =>
            setDraft({
              ...draft,
              minDays: event.target.value === "" ? null : Number(event.target.value),
            })
          }
        />
      </label>
      <label className="flex items-center gap-2 text-sm font-bold">
        <input
          type="checkbox"
          checked={draft.needsAdapter === true}
          onChange={(event) => setDraft({ ...draft, needsAdapter: event.target.checked ? true : null })}
        />
        需要轉接頭才出現
      </label>
      <label className="flex items-center gap-2 text-sm font-bold">
        <input
          type="checkbox"
          checked={draft.highVoltage === true}
          onChange={(event) => setDraft({ ...draft, highVoltage: event.target.checked ? true : null })}
        />
        高電壓國家才出現
      </label>
      <div className="flex gap-2">
        <button type="submit" className="wire-btn wire-btn-primary flex-1">
          儲存規則
        </button>
        <button type="button" className="wire-btn flex-1" onClick={onClear}>
          清除
        </button>
      </div>
    </form>
  );
}
