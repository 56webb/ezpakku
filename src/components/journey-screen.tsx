"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BAG_COLORS, BAG_TYPES } from "@/lib/constants";
import { isIsoDate, todayISO } from "@/lib/dates";
import { bagsFor, canEditJourney, itemsFor, journeyItemName, ownedJourneyCount, quoteCreate } from "@/lib/domain";
import { packingWarnings, SAFETY_TAGS } from "@/lib/rules/generator";
import { systemCategories, systemItems } from "@/lib/seed";
import { useStore } from "@/lib/store";
import type { BagType } from "@/lib/types";
import { BagGlyph, BagPicker, ErrorText, Phone, bagLabel } from "@/components/ui";

export function JourneyScreen({ journeyId }: { journeyId: string }) {
  const store = useStore();
  const router = useRouter();
  const journey = store.state.journeys.find((entry) => entry.id === journeyId);
  const user = store.user;
  const [error, setError] = useState("");
  const [movingId, setMovingId] = useState<string | null>(null);
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
  const totalProgress = rows.length === 0 ? 0 : Math.round((rows.filter((row) => row.isChecked).length / rows.length) * 100);
  const warnings = useMemo(() => packingWarnings(bags, rows), [bags, rows]);

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

  return (
    <Phone
      header={
        <header className="flex items-center justify-between border-b-2 border-black px-4 py-3">
          <Link href="/" className="text-sm font-bold underline">主頁</Link>
          <p className="font-black">{journey.name}</p>
        </header>
      }
    >
      <main className="flex flex-col gap-4 p-4">
        <p className="text-xs">建立模式：{journey.mode === "detail" ? "細節控" : "通用範本"}</p>
        {!owner && <p className="text-xs font-bold">你正在編輯共用清單</p>}
        <ErrorText>{error}</ErrorText>
        <section className="wire-card" aria-label="打包進度">
          <div className="flex items-center justify-between text-sm font-bold">
            <span>總進度</span>
            <span>{totalProgress}%</span>
          </div>
          <div className="progress-track mt-2" aria-hidden="true">
            <div className="progress-fill" style={{ width: `${totalProgress}%` }} />
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
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            saveMeta();
          }}
        >
          <label className="wire-field">名稱<input value={meta.name} onChange={(event) => setMeta({ ...meta, name: event.target.value })} /></label>
          <label className="wire-field">地點<input value={meta.location} onChange={(event) => setMeta({ ...meta, location: event.target.value })} /></label>
          <label className="wire-field">天數<input inputMode="numeric" value={meta.days} onChange={(event) => setMeta({ ...meta, days: event.target.value })} /></label>
          <label className="wire-field">出發日<input type="date" value={meta.startDate} onChange={(event) => setMeta({ ...meta, startDate: event.target.value })} /></label>
          <label className="wire-field">目的<input value={meta.purpose} onChange={(event) => setMeta({ ...meta, purpose: event.target.value })} /></label>
          <button type="submit" className="wire-btn">儲存旅程資料</button>
        </form>

        {bags.map((bag) => {
          const bagRows = rows.filter((row) => row.bagId === bag.id);
          const bagDone = bagRows.filter((row) => row.isChecked).length;
          const bagProgress = bagRows.length === 0 ? 0 : Math.round((bagDone / bagRows.length) * 100);
          return (
          <section key={bag.id} className={`wire-card ${bag.sealed ? "bag-sealed" : ""}`}>
            <h2 className="flex flex-wrap items-center gap-2 font-black">
              <BagGlyph type={bag.type} />
              {bag.name}
              <span className="text-xs font-normal">{bagLabel(bag.type)}</span>
              {bag.sealed && <span className="text-xs font-bold text-[var(--accent)]">已封箱</span>}
            </h2>
            <div className="mt-2 flex items-center justify-between text-xs font-bold">
              <span>
                {bagDone}/{bagRows.length}
              </span>
              <span>{bagProgress}%</span>
            </div>
            <div className="progress-track mt-1" aria-hidden="true">
              <div className="progress-fill" style={{ width: `${bagProgress}%` }} />
            </div>
            <button
              type="button"
              className="wire-btn mt-3 w-full"
              onClick={() => {
                if (!bag.sealed) {
                  const open = bagRows.filter((row) => !row.isChecked).length;
                  if (open > 0 && !window.confirm(`還有 ${open} 項沒打勾，仍要封箱？`)) return;
                }
                const result = store.sealBag(bag.id, !bag.sealed);
                setError(result.ok ? "" : result.reason);
              }}
            >
              {bag.sealed ? "開箱" : "封箱"}
            </button>
            {!bag.sealed && (
              <>
                <ul className="mt-3 flex flex-col gap-2">
                  {bagRows.map((row) => (
                    <li key={row.id} className="border-t border-black/20 pt-2">
                      <label className="flex items-center gap-2 font-bold">
                        <input
                          type="checkbox"
                          data-testid="packed-toggle"
                          checked={row.isChecked}
                          onChange={() => {
                            const result = store.toggleItem(row.id);
                            if (!result.ok) setError(result.reason);
                          }}
                        />
                        <span className={row.isChecked ? "line-through" : undefined}>{journeyItemName(store.state, row)}</span>
                      </label>
                      {(row.tags?.length ?? 0) > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {row.tags.map((tag) => (
                            <span key={tag} className="tag-chip">
                              {SAFETY_TAGS[tag]?.label ?? tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <span className="mt-1 flex gap-3 text-xs">
                        <button type="button" className="underline" onClick={() => setMovingId(row.id)}>換包</button>
                        <button
                          type="button"
                          className="underline"
                          onClick={() => {
                            const result = store.removeItem(row.id);
                            if (!result.ok) setError(result.reason);
                          }}
                        >
                          移出
                        </button>
                      </span>
                      {movingId === row.id && (
                        <>
                          <BagPicker bags={bags} onPick={(bagId) => {
                            const result = store.moveItem(row.id, bagId);
                            setError(result.ok ? "" : result.reason);
                            if (result.ok) setMovingId(null);
                          }} />
                          <button type="button" className="text-xs underline" onClick={() => setMovingId(null)}>保持原包包</button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
                <button type="button" data-testid="add-item" className="wire-btn mt-3 w-full" onClick={() => setAddingBagId(addingBagId === bag.id ? null : bag.id)}>
                  + 新增物品
                </button>
                {addingBagId === bag.id && (
                  <div className="mt-3 flex flex-col gap-2">
                    {systemCategories.map((category) => (
                      <details key={category.id}>
                        <summary className="cursor-pointer font-bold">{category.name}</summary>
                        <ul>
                          {systemItems.filter((item) => item.categoryId === category.id).map((item) => (
                            <li key={item.id}>
                              <button
                                type="button"
                                className="py-1 text-left text-sm underline"
                                onClick={() => {
                                  const result = store.addItem({
                                    journeyId,
                                    bagId: bag.id,
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
                          bagId: bag.id,
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
                      <label className="wire-field">自訂物品<input value={customName} onChange={(event) => setCustomName(event.target.value)} /></label>
                      <label className="wire-field">
                        分類
                        <select value={customCategoryId} onChange={(event) => setCustomCategoryId(event.target.value)}>
                          {systemCategories.map((category) => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                          ))}
                        </select>
                      </label>
                      <button type="submit" className="wire-btn">加入這個包包</button>
                    </form>
                  </div>
                )}
              </>
            )}
          </section>
          );
        })}

        <button type="button" className="wire-btn" onClick={() => setBagOpen((open) => !open)}>新增包包</button>
        {bagOpen && (
          <form
            className="flex flex-col gap-2"
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
              <select value={bagType} onChange={(event) => {
                const next = event.target.value as BagType;
                setBagType(next);
                setBagName(bagLabel(next));
              }}>
                {BAG_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
              </select>
            </label>
            <label className="wire-field">名稱<input value={bagName} onChange={(event) => setBagName(event.target.value)} /></label>
            <button type="submit" className="wire-btn wire-btn-primary">儲存包包</button>
          </form>
        )}

        <button type="button" data-testid="copy-journey" className="wire-btn" onClick={copyList}>複製整份清單</button>
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
            <button type="submit" className="wire-btn wire-btn-primary">佔用欄位並複製</button>
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
            <button
              type="button"
              data-testid="share-readonly"
              className="wire-btn"
              onClick={() => publish("read_only")}
            >
              唯讀
            </button>
            <button
              type="button"
              data-testid="share-editable"
              className="wire-btn"
              onClick={() => publish("editable")}
            >
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
