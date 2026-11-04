"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCatalog, useCatalogActions } from "@/hooks/use-catalog";
import { categoryName } from "@/lib/catalog/local";
import { LUGGAGE_PLANS, PREVIEW_CLIMATES, previewCatalog, TRAVEL_TYPES } from "@/lib/catalog/preview";
import type {
  CatalogAffiliate,
  CatalogBagPreset,
  CatalogItemRow,
  CatalogItemRule,
  CatalogPreviewInput,
} from "@/lib/catalog/types";
import { BAG_COLORS, BAG_TYPES } from "@/lib/constants";
import { systemCategories } from "@/lib/seed";
import type { ClimateChoice, LuggagePlan, TravelType } from "@/lib/rules/generator";
import type { BagType } from "@/lib/types";
import { Phone } from "@/components/ui";

type Tab = "items" | "affiliates" | "presets" | "rules" | "preview";

const TABS: { id: Tab; label: string }[] = [
  { id: "items", label: "物品" },
  { id: "affiliates", label: "業配" },
  { id: "presets", label: "箱子" },
  { id: "rules", label: "規則" },
  { id: "preview", label: "預覽" },
];

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function AdminScreen() {
  const catalog = useCatalog();
  const actions = useCatalogActions();
  const [tab, setTab] = useState<Tab>("items");
  const [message, setMessage] = useState("");

  if (!catalog) {
    return (
      <Phone header={<header className="border-b border-[var(--line)] px-4 py-3"><p className="brand-mark">RYMIN</p></header>}>
        <main className="p-4 text-sm">載入 catalog…</main>
      </Phone>
    );
  }

  return (
    <Phone
      header={
        <header className="border-b border-[var(--line)] px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="brand-mark">RYMIN</p>
              <h1 className="text-xl font-black">Catalog 後台</h1>
              <p className="text-xs text-[var(--ink-soft)]">版本 v{catalog.version} · 本機草稿</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Link href="/" className="text-sm underline">
                回 App
              </Link>
              <button
                type="button"
                className="text-xs underline"
                onClick={() => {
                  actions.reset();
                  setMessage("已還原預設 catalog");
                }}
              >
                還原預設
              </button>
            </div>
          </div>
          <nav className="mt-3 flex gap-1 overflow-x-auto" aria-label="後台分頁">
            {TABS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                data-testid={`admin-tab-${entry.id}`}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-bold ${
                  tab === entry.id ? "bg-[var(--accent)] text-white" : "bg-white border border-[var(--line)]"
                }`}
                onClick={() => {
                  setTab(entry.id);
                  setMessage("");
                }}
              >
                {entry.label}
              </button>
            ))}
          </nav>
        </header>
      }
    >
      <main className="flex flex-col gap-3 p-4">
        {message ? <p className="text-sm font-bold text-[var(--accent-strong)]">{message}</p> : null}
        {tab === "items" ? <ItemsPanel onNotice={setMessage} /> : null}
        {tab === "affiliates" ? <AffiliatesPanel onNotice={setMessage} /> : null}
        {tab === "presets" ? <PresetsPanel onNotice={setMessage} /> : null}
        {tab === "rules" ? <RulesPanel onNotice={setMessage} /> : null}
        {tab === "preview" ? <PreviewPanel /> : null}
      </main>
    </Phone>
  );
}

function ItemsPanel({ onNotice }: { onNotice: (text: string) => void }) {
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

function AffiliatesPanel({ onNotice }: { onNotice: (text: string) => void }) {
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

function PresetsPanel({ onNotice }: { onNotice: (text: string) => void }) {
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

function PresetForm({
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

function RulesPanel({ onNotice }: { onNotice: (text: string) => void }) {
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

function PreviewPanel() {
  const catalog = useCatalog();
  const [input, setInput] = useState<CatalogPreviewInput>({
    country: "日本",
    days: 5,
    travelType: "city",
    luggage: "checked",
    climate: "auto",
  });
  const result = useMemo(() => (catalog ? previewCatalog(catalog, input) : null), [catalog, input]);

  if (!catalog) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-black">營運預覽</h2>
      <p className="text-sm text-[var(--ink-soft)]">模擬會生出哪些包與物品。不是旅人 App 畫面。</p>
      <label className="wire-field">
        國家／地區
        <input
          value={input.country}
          onChange={(event) => setInput({ ...input, country: event.target.value })}
          placeholder="日本"
        />
      </label>
      <label className="wire-field">
        天數
        <input
          type="number"
          min={1}
          value={input.days}
          onChange={(event) => setInput({ ...input, days: Math.max(1, Number(event.target.value) || 1) })}
        />
      </label>
      <label className="wire-field">
        類型
        <select
          value={input.travelType}
          onChange={(event) => setInput({ ...input, travelType: event.target.value as TravelType })}
        >
          {TRAVEL_TYPES.map((type) => (
            <option key={type.id} value={type.id}>
              {type.label}
            </option>
          ))}
        </select>
      </label>
      <label className="wire-field">
        行李
        <select
          value={input.luggage}
          onChange={(event) => setInput({ ...input, luggage: event.target.value as LuggagePlan })}
        >
          {LUGGAGE_PLANS.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.label}
            </option>
          ))}
        </select>
      </label>
      <label className="wire-field">
        氣候
        <select
          value={input.climate}
          onChange={(event) => setInput({ ...input, climate: event.target.value as ClimateChoice })}
        >
          {PREVIEW_CLIMATES.map((climate) => (
            <option key={climate.id} value={climate.id}>
              {climate.label}
            </option>
          ))}
        </select>
      </label>
      {result ? (
        <div className="wire-card flex flex-col gap-2">
          <p className="text-sm">
            {result.meta.countryCode ?? "未知國碼"} · {result.meta.international ? "出國" : "國內"} · 氣候{" "}
            {result.meta.climates.join("/") || "—"}
            {result.meta.needsAdapter ? " · 需轉接頭" : ""}
            {result.meta.highVoltage ? " · 高電壓" : ""}
          </p>
          <p className="font-bold">
            箱子：{result.preset ? `${result.preset.name}（${result.preset.bags.map((bag) => bag.name).join("、")}）` : "無對應預設"}
          </p>
          <p className="text-sm font-bold">物品 {result.items.length}</p>
          <ul className="flex flex-col gap-1">
            {result.items.map((item) => (
              <li key={item.id} className="border-b border-[var(--line)] py-2 text-sm last:border-b-0">
                <span className="font-bold">{item.name}</span>
                <span className="text-[var(--ink-soft)]"> · {categoryName(item.categoryId)}</span>
                {item.affiliateUrl ? <span className="text-[var(--accent-strong)]"> · 導購</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
