"use client";

import Link from "next/link";
import { useState } from "react";
import { useCatalog, useCatalogActions } from "@/hooks/use-catalog";
import { Phone } from "@/components/ui";
import { AffiliatesPanel } from "@/components/admin/affiliates-panel";
import { ItemsPanel } from "@/components/admin/items-panel";
import { PresetsPanel } from "@/components/admin/presets-panel";
import { PreviewPanel } from "@/components/admin/preview-panel";
import { RulesPanel } from "@/components/admin/rules-panel";

type Tab = "items" | "affiliates" | "presets" | "rules" | "preview";

const TABS: { id: Tab; label: string }[] = [
  { id: "items", label: "物品" },
  { id: "affiliates", label: "業配" },
  { id: "presets", label: "箱子" },
  { id: "rules", label: "規則" },
  { id: "preview", label: "預覽" },
];

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
