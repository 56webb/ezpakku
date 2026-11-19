"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useEditLock } from "@/hooks/use-edit-lock";
import { BAG_COLORS, BAG_TYPES } from "@/lib/constants";
import { isIsoDate, todayISO } from "@/lib/dates";
import { bagsFor, canEditJourney, itemsFor, journeyItemName, ownedJourneyCount, quoteCreate } from "@/lib/domain";
import { packingWarnings, SAFETY_TAGS } from "@/lib/rules/generator";
import { systemCategories, systemItems } from "@/lib/seed";
import { useStore } from "@/lib/store";
import type { Bag, BagType, JourneyItem } from "@/lib/types";
import { BagGlyph, BagPicker, ErrorText, Phone, bagLabel } from "@/components/ui";

type ViewMode = "bags" | "all";

export function JourneyScreen({ journeyId }: { journeyId: string }) {
  const store = useStore();
  const router = useRouter();
  const journey = store.state.journeys.find((entry) => entry.id === journeyId);
  const user = store.user;
  const mayEdit = Boolean(user && journey && canEditJourney(store.state, user.id, journey.id));
  const editLock = useEditLock(journeyId, user?.id ?? null, mayEdit);
  const writeBlocked = editLock.status === "blocked" || editLock.status === "acquiring";
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("bags");
  const [query, setQuery] = useState("");
  const [movingId, setMovingId] = useState<string | null>(null);
  const [noteEditingId, setNoteEditingId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [addingBagId, setAddingBagId] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const [customCategoryId, setCustomCategoryId] = useState(systemCategories[0].id);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [bagOpen, setBagOpen] = useState(false);
  const [bagName, setBagName] = useState("行李箱");
  const [bagType, setBagType] = useState<BagType>("suitcase");
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyDate, setCopyDate] = useState(todayISO());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [meta, setMeta] = useState(() =>
    journey
      ? {
          name: journey.name,
          location: journey.location,
          days: String(journey.days),
          purpose: journey.purpose,
          startDate: journey.startDate,
        }
      : null,
  );

  const bags = useMemo(() => (journey ? bagsFor(store.state, journey.id) : []), [journey, store.state]);
  const rows = useMemo(() => (journey ? itemsFor(store.state, journey.id) : []), [journey, store.state]);
  const catalogCategories = store.state.categories.length ? store.state.categories : systemCategories;
  const catalogItems = store.state.items.length ? store.state.items : systemItems;

  const checkedCount = rows.filter((row) => row.isChecked).length;
  const totalProgress = rows.length === 0 ? 0 : Math.round((checkedCount / rows.length) * 100);
  const sealedCount = bags.filter((bag) => bag.sealed).length;
  const warnings = useMemo(() => packingWarnings(bags, rows), [bags, rows]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const name = journeyItemName(store.state, row).toLowerCase();
      const bagNameValue = bags.find((bag) => bag.id === row.bagId)?.name.toLowerCase() ?? "";
      return name.includes(q) || bagNameValue.includes(q) || row.note.toLowerCase().includes(q);
    });
  }, [bags, query, rows, store.state]);

  if (!user) return null;
  const currentUser = user;
  if (!journey || !meta) {
    return (
      <Phone>
        <main className="p-4">
          <p>找不到這份清單。</p>
          <Link href="/" className="mt-3 inline-block underline">回主頁</Link>
        </main>
      </Phone>
    );
  }
  if (!canEditJourney(store.state, user.id, journey.id)) {
    return (
      <Phone>
        <main className="flex flex-col gap-3 p-4">
          <p>這份清單沒有開放給你編輯。若你有分享連結，請從連結進入。</p>
          <Link href="/" className="underline">回主頁</Link>
        </main>
      </Phone>
    );
  }

  const owner = journey.ownerId === user.id;
  const share = store.state.shares.find((entry) => entry.journeyId === journey.id);

  function saveMeta() {
    if (writeBlocked) {
      setError(editLock.reason ?? "其他人正在編輯這份清單");
      return;
    }
    const result = store.updateMeta(journeyId, {
      name: meta?.name,
      location: meta?.location,
      purpose: meta?.purpose,
      days: Number(meta?.days),
      startDate: meta?.startDate,
    });
    setError(result.ok ? "" : result.reason);
  }

  function copyList() {
    const quote = quoteCreate(currentUser, ownedJourneyCount(store.state, currentUser.id));
    if (!quote.allowed) {
      setError(quote.reason ?? "沒有空的旅程欄位");
      return;
    }
    setCopyOpen(true);
    setError("");
  }

  function confirmCopy() {
    if (!isIsoDate(copyDate)) {
      setError("請選出發日");
      return;
    }
    const result = store.copy(journeyId, copyDate);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    router.push(`/journey/${result.id}`);
  }

  function publish(permission: "read_only" | "editable") {
    const result = store.share(journeyId, permission);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    setShareUrl(`${window.location.origin}/share/${result.token}`);
    setError("");
  }

  function sealBag(bag: Bag, bagRows: JourneyItem[]) {
    if (!bag.sealed) {
      const open = bagRows.filter((row) => !row.isChecked).length;
      if (open > 0 && !window.confirm(`還有 ${open} 項沒打勾，仍要封箱？`)) return;
    }
    const result = store.sealBag(bag.id, !bag.sealed);
    setError(result.ok ? "" : result.reason);
  }

  function startNote(row: JourneyItem) {
    setNoteEditingId(row.id);
    setNoteDraft(row.note);
  }

  function saveNote(rowId: string) {
    const result = store.updateItemNote(rowId, noteDraft);
    setError(result.ok ? "" : result.reason);
    if (result.ok) setNoteEditingId(null);
  }

  function renderItemRow(row: JourneyItem, bag: Bag | undefined) {
    const sealed = Boolean(bag?.sealed);
    return (
      <li key={row.id} className={`pack-item ${row.isChecked ? "is-checked" : ""}`}>
        <label className="pack-item-main">
          <input
            type="checkbox"
            data-testid="packed-toggle"
            checked={row.isChecked}
            disabled={sealed || writeBlocked}
            onChange={() => {
              const result = store.toggleItem(row.id);
              if (!result.ok) setError(result.reason);
            }}
          />
          <span className="pack-item-text">
            <span className="pack-item-name">{journeyItemName(store.state, row)}</span>
            {row.note ? <span className="pack-item-note">{row.note}</span> : null}
            {viewMode === "all" && bag ? <span className="pack-item-bag">{bag.name}</span> : null}
          </span>
        </label>
        {(row.tags?.length ?? 0) > 0 && (
          <div className="pack-item-tags">
            {row.tags.map((tag) => (
              <span key={tag} className="tag-chip">
                {SAFETY_TAGS[tag]?.label ?? tag}
              </span>
            ))}
          </div>
        )}
        {!sealed && (
          <div className="pack-item-actions">
            <button type="button" className="pack-icon-btn" onClick={() => startNote(row)} aria-label="備註">
              備註
            </button>
            <button type="button" className="pack-icon-btn" onClick={() => setMovingId(row.id)} aria-label="換包">
              換包
            </button>
            <button
              type="button"
              className="pack-icon-btn danger"
              onClick={() => {
                const result = store.removeItem(row.id);
                if (!result.ok) setError(result.reason);
              }}
              aria-label="移出"
            >
              移出
            </button>
          </div>
        )}
        {noteEditingId === row.id && (
          <form
            className="pack-note-form"
            onSubmit={(event) => {
              event.preventDefault();
              saveNote(row.id);
            }}
          >
            <label className="wire-field">
              備註說明
              <textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} rows={2} />
            </label>
            <div className="flex gap-2">
              <button type="submit" className="wire-btn wire-btn-primary flex-1">儲存</button>
              <button type="button" className="wire-btn flex-1" onClick={() => setNoteEditingId(null)}>取消</button>
            </div>
          </form>
        )}
        {movingId === row.id && (
          <div className="mt-2">
            <BagPicker
              bags={bags}
              onPick={(bagId) => {
                const result = store.moveItem(row.id, bagId);
                setError(result.ok ? "" : result.reason);
                if (result.ok) setMovingId(null);
              }}
            />
            <button type="button" className="mt-1 text-xs underline" onClick={() => setMovingId(null)}>
              保持原包包
            </button>
          </div>
        )}
      </li>
    );
  }

  function renderAddPanel(bagId: string) {
    if (addingBagId !== bagId) return null;
    return (
      <div className="pack-add-panel">
        {catalogCategories.map((category) => (
          <details key={category.id}>
            <summary className="cursor-pointer font-bold">{category.name}</summary>
            <ul>
              {catalogItems
                .filter((item) => item.categoryId === category.id && item.isActive)
                .map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="py-1 text-left text-sm underline"
                      onClick={() => {
                        const result = store.addItem({
                          journeyId,
                          bagId,
                          itemId: item.id,
                          customName: null,
                          categoryId: item.categoryId,
                        });
                        setError(result.ok ? "" : result.reason);
                      }}
                    >
                      {item.name}
                    </button>
                  </li>
                ))}
            </ul>
          </details>
        ))}
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const result = store.addItem({
              journeyId,
              bagId,
              itemId: null,
              customName,
              categoryId: customCategoryId,
            });
            if (!result.ok) {
              setError(result.reason);
              return;
            }
            setCustomName("");
            setError("");
          }}
        >
          <label className="wire-field">
            自訂物品
            <input value={customName} onChange={(event) => setCustomName(event.target.value)} />
          </label>
          <label className="wire-field">
            分類
            <select value={customCategoryId} onChange={(event) => setCustomCategoryId(event.target.value)}>
              {catalogCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="wire-btn wire-btn-primary">
            加入這個包包
          </button>
        </form>
      </div>
    );
  }

  return (
    <Phone
      header={
        <header className="pack-header">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm font-bold text-[var(--accent-strong)]">
              主頁
            </Link>
            <div>
              <p className="brand-mark">EZpakku</p>
              <h1 className="text-base font-black leading-tight">{journey.name}</h1>
            </div>
          </div>
          <button
            type="button"
            className="pack-icon-btn"
            aria-label="設定"
            onClick={() => setSettingsOpen((open) => !open)}
          >
            設定
          </button>
        </header>
      }
    >
      <main className="pack-main">
        {!owner && <p className="text-xs font-bold text-[var(--accent-strong)]">你正在編輯共用清單</p>}
        {editLock.status === "acquiring" ? <p className="wire-card text-sm">正在取得編輯權…</p> : null}
        {editLock.status === "blocked" ? (
          <p role="status" className="warning-banner text-sm font-bold">
            {editLock.reason ?? "其他人正在編輯這份清單"}。你目前只能查看；對方離開後會自動再取得編輯權。
          </p>
        ) : null}
        <ErrorText>{error}</ErrorText>

        <section className="pack-dashboard" aria-label="打包進度">
          <div className="pack-dash-card pack-dash-main">
            <div className="flex items-center justify-between gap-2">
              <p className="pack-dash-title">總打包進度</p>
              <span className="pack-dash-pct">{totalProgress}%</span>
            </div>
            <div className="progress-track mt-3" aria-hidden="true">
              <div className="progress-fill" style={{ width: `${totalProgress}%` }} />
            </div>
            <div className="pack-dash-stats">
              <span>已收拾 {checkedCount}</span>
              <span>待收拾 {rows.length - checkedCount}</span>
              <span>總件數 {rows.length}</span>
            </div>
          </div>
          <div className="pack-dash-side">
            <div className="pack-stat-pill">
              <strong>{bags.length}</strong>
              <span>啟用包包</span>
            </div>
            <div className="pack-stat-pill">
              <strong>{sealedCount}</strong>
              <span>已封箱</span>
            </div>
          </div>
        </section>

        {warnings.length > 0 && (
          <section className="warning-banner" role="alert">
            <p className="font-black">托運警告</p>
            {warnings.map((warning) => (
              <p key={warning.bagId} className="mt-1 text-sm leading-5">
                「{warning.bagName}」裡有不能托運的物品：
                {warning.itemTags.map((tag) => SAFETY_TAGS[tag]?.title ?? tag).join("、")}
              </p>
            ))}
          </section>
        )}

        <div className="pack-toolbar">
          <div className="pack-tabs" role="tablist" aria-label="檢視方式">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "all"}
              className={viewMode === "all" ? "is-active" : undefined}
              onClick={() => setViewMode("all")}
            >
              全部物品
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "bags"}
              className={viewMode === "bags" ? "is-active" : undefined}
              onClick={() => setViewMode("bags")}
            >
              包包細項
            </button>
          </div>
          <label className="pack-search">
            <span className="sr-only">搜尋物品</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜尋物品、包包或備註…"
            />
          </label>
        </div>

        {settingsOpen && (
          <section className="wire-card flex flex-col gap-3">
            <p className="text-sm font-bold">旅程資料 · {journey.mode === "detail" ? "細節控" : "通用範本"}</p>
            <form
              className="flex flex-col gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                saveMeta();
              }}
            >
              <label className="wire-field">
                名稱
                <input value={meta.name} onChange={(event) => setMeta({ ...meta, name: event.target.value })} />
              </label>
              <label className="wire-field">
                地點
                <input value={meta.location} onChange={(event) => setMeta({ ...meta, location: event.target.value })} />
              </label>
              <label className="wire-field">
                天數
                <input inputMode="numeric" value={meta.days} onChange={(event) => setMeta({ ...meta, days: event.target.value })} />
              </label>
              <label className="wire-field">
                出發日
                <input type="date" value={meta.startDate} onChange={(event) => setMeta({ ...meta, startDate: event.target.value })} />
              </label>
              <label className="wire-field">
                目的
                <input value={meta.purpose} onChange={(event) => setMeta({ ...meta, purpose: event.target.value })} />
              </label>
              <button type="submit" className="wire-btn wire-btn-primary">
                儲存旅程資料
              </button>
            </form>
          </section>
        )}

        {viewMode === "bags" ? (
          <div className="pack-bag-stack">
            {bags.map((bag) => {
              const bagRows = filteredRows.filter((row) => row.bagId === bag.id);
              const bagDone = bagRows.filter((row) => row.isChecked).length;
              const bagProgress = bagRows.length === 0 ? 0 : Math.round((bagDone / bagRows.length) * 100);
              return (
                <section key={bag.id} className={`pack-bag-card ${bag.sealed ? "bag-sealed" : ""}`}>
                  <div className="pack-bag-top">
                    <div className="pack-bag-title">
                      <BagGlyph type={bag.type} size={36} />
                      <div>
                        <h2 className="pack-bag-name">{bag.name}</h2>
                        <p className="pack-bag-sub">{bagLabel(bag.type)}</p>
                      </div>
                    </div>
                    <span className={`seal-badge ${bag.sealed ? "sealed" : "unsealed"}`}>
                      {bag.sealed ? "已封箱" : "未封箱"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs font-bold text-[var(--ink-soft)]">
                    <span>
                      {bagDone}/{bagRows.length}
                    </span>
                    <span>{bagProgress}%</span>
                  </div>
                  <div className="progress-track mt-1" aria-hidden="true">
                    <div className="progress-fill" style={{ width: `${bagProgress}%` }} />
                  </div>
                  {!bag.sealed && <ul className="pack-item-list">{bagRows.map((row) => renderItemRow(row, bag))}</ul>}
                  {bag.sealed && bagRows.length > 0 && (
                    <p className="mt-3 text-sm text-[var(--ink-soft)]">已封箱，開箱後可再調整物品。</p>
                  )}
                  <div className="pack-bag-actions">
                    <button type="button" className="wire-btn wire-btn-primary flex-1" onClick={() => sealBag(bag, bagRows)}>
                      {bag.sealed ? "開箱" : "一鍵封箱"}
                    </button>
                    {!bag.sealed && (
                      <button
                        type="button"
                        data-testid="add-item"
                        className="wire-btn flex-1"
                        onClick={() => setAddingBagId(addingBagId === bag.id ? null : bag.id)}
                      >
                        塞入新物品
                      </button>
                    )}
                  </div>
                  {renderAddPanel(bag.id)}
                </section>
              );
            })}
          </div>
        ) : (
          <section className="pack-bag-card">
            <h2 className="pack-bag-name">全部物品</h2>
            <ul className="pack-item-list">
              {filteredRows.map((row) => renderItemRow(row, bags.find((bag) => bag.id === row.bagId)))}
            </ul>
            {filteredRows.length === 0 && <p className="mt-3 text-sm text-[var(--ink-soft)]">沒有符合搜尋的物品。</p>}
          </section>
        )}

        <button type="button" className="wire-btn" onClick={() => setBagOpen((open) => !open)}>
          管理／新增包包
        </button>
        {bagOpen && (
          <form
            className="wire-card flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const result = store.createBag(journeyId, { name: bagName, type: bagType, color: BAG_COLORS[0] });
              if (!result.ok) {
                setError(result.reason);
                return;
              }
              setBagOpen(false);
              setError("");
            }}
          >
            <label className="wire-field">
              類型
              <select
                value={bagType}
                onChange={(event) => {
                  const next = event.target.value as BagType;
                  setBagType(next);
                  setBagName(bagLabel(next));
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
              名稱
              <input value={bagName} onChange={(event) => setBagName(event.target.value)} />
            </label>
            <button type="submit" className="wire-btn wire-btn-primary">
              儲存包包
            </button>
          </form>
        )}

        <button type="button" data-testid="copy-journey" className="wire-btn" onClick={copyList}>
          複製整份清單
        </button>
        {copyOpen && (
          <form
            className="wire-card flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              confirmCopy();
            }}
          >
            <p className="text-sm">複製會佔用一個旅程欄位。新清單的天數跟原清單現在一樣，也算進累計。</p>
            <label className="wire-field">
              新清單的出發日
              <input data-testid="copy-start" type="date" value={copyDate} onChange={(event) => setCopyDate(event.target.value)} required />
            </label>
            <button type="submit" className="wire-btn wire-btn-primary">
              佔用欄位並複製
            </button>
          </form>
        )}
        {owner && (
          <button type="button" data-testid="share-open" className="wire-btn" onClick={() => setShareOpen(true)}>
            分享{share ? `（目前${share.permission === "read_only" ? "唯讀" : "可編輯"}）` : ""}
          </button>
        )}
        {shareOpen && owner && (
          <div className="wire-pop flex flex-col gap-2">
            <p className="text-sm">權限對所有拿到連結的人相同。不會發通知。再分享一次會改掉舊連結的權限，連結本身不變。</p>
            <button type="button" data-testid="share-readonly" className="wire-btn" onClick={() => publish("read_only")}>
              唯讀
            </button>
            <button type="button" data-testid="share-editable" className="wire-btn" onClick={() => publish("editable")}>
              可編輯
            </button>
            {shareUrl && (
              <label className="wire-field">
                分享連結
                <input data-testid="share-url" readOnly value={shareUrl} />
              </label>
            )}
          </div>
        )}
        {owner && (
          <button
            type="button"
            data-testid="delete-journey"
            className="wire-btn"
            onClick={() => {
              if (!window.confirm("刪除後這一格可以再放新清單。用點數加的欄位不會消失，累計天數也不再算這份。確定刪除？")) return;
              const result = store.remove(journeyId);
              if (!result.ok) {
                setError(result.reason);
                return;
              }
              router.push("/");
            }}
          >
            刪除清單
          </button>
        )}
      </main>
    </Phone>
  );
}
