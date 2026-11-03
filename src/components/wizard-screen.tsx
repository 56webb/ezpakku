"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  clearDraft,
  getDraftServerSnapshot,
  getDraftSnapshot,
  subscribeDraft,
  writeDraft,
} from "@/lib/browser-state";
import { BAG_COLORS, BAG_TYPES, POINTS_PER_SLOT } from "@/lib/constants";
import { isIsoDate } from "@/lib/dates";
import { todayISO } from "@/lib/dates";
import { systemCategories, systemItems } from "@/lib/seed";
import { useStore } from "@/lib/store";
import type { BagType, Category, ListMode } from "@/lib/types";
import { BagStudio } from "@/components/bag-studio";
import { DestinationMap } from "@/components/destination-map";
import { BagPicker, BottomNav, ErrorText, Phone, bagLabel } from "@/components/ui";
import {
  generatePackingList,
  LUGGAGE_PLANS,
  TRAVEL_TYPES,
  type LuggagePlan,
  type TravelType,
} from "@/lib/rules/generator";
import { tripPresets, type TripPreset } from "@/lib/trip-presets";

type Step = "mode" | "map" | "basics" | "preset" | "bags" | "bag-form" | "items" | "name";

type DraftBag = { localId: string; name: string; type: BagType; color: string };
type DraftSelection = {
  localId: string;
  itemId: string | null;
  customName: string | null;
  categoryId: string;
  bagLocalId: string;
  tags?: string[];
  note?: string;
};

type Draft = {
  step: Step;
  mode: ListMode | null;
  modeLocked: boolean;
  location: string;
  country: string;
  city: string;
  days: string;
  purpose: string;
  startDate: string;
  bags: DraftBag[];
  editingBagId: string | null;
  bagName: string;
  bagType: BagType;
  bagColor: string;
  selections: DraftSelection[];
  templateApplied: boolean;
  presetId: string | null;
  travelTypes: TravelType[];
  luggage: LuggagePlan;
  categoryOrder: string[];
  hiddenCategoryIds: string[];
  collapsedCategoryIds: string[];
  customCategories: Category[];
  newCategoryName: string;
  customItemName: string;
  customItemCategoryId: string;
  name: string;
  batch: boolean;
  batchSelected: string[];
  pendingKey: string | null;
  rebindingId: string | null;
  error: string;
};

function emptyDraft(): Draft {
  return {
    step: "mode",
    mode: null,
    modeLocked: false,
    location: "",
    country: "",
    city: "",
    days: "3",
    purpose: "",
    startDate: "",
    bags: [],
    editingBagId: null,
    bagName: "行李箱",
    bagType: "suitcase",
    bagColor: BAG_COLORS[0],
    selections: [],
    templateApplied: false,
    presetId: null,
    travelTypes: ["city"],
    luggage: "checked",
    categoryOrder: systemCategories.map((category) => category.id),
    hiddenCategoryIds: [],
    collapsedCategoryIds: [],
    customCategories: [],
    newCategoryName: "",
    customItemName: "",
    customItemCategoryId: systemCategories[0].id,
    name: "",
    batch: false,
    batchSelected: [],
    pendingKey: null,
    rebindingId: null,
    error: "",
  };
}

export function WizardScreen() {
  const store = useStore();
  const router = useRouter();
  const [blockError, setBlockError] = useState("");
  const storedDraft = useSyncExternalStore(subscribeDraft, getDraftSnapshot, getDraftServerSnapshot);
  const draft = useMemo(() => ({ ...emptyDraft(), ...(storedDraft ?? {}) }) as Draft, [storedDraft]);

  const categories = useMemo(
    () =>
      draft.categoryOrder
        .map((id) => [...systemCategories, ...draft.customCategories].find((category) => category.id === id))
        .filter((category): category is Category => Boolean(category))
        .filter((category) => !draft.hiddenCategoryIds.includes(category.id)),
    [draft.categoryOrder, draft.customCategories, draft.hiddenCategoryIds],
  );

  if (!store.user || !store.quote) return null;
  if (!store.quote.allowed) {
    return (
      <Phone footer={<BottomNav />}>
        <main className="flex flex-col gap-3 p-4">
          <h1 className="text-xl font-black">旅程欄位已滿</h1>
          <p className="text-sm leading-6">
            欄位滿了就不能再建。{POINTS_PER_SLOT} 點可以永久再加一格，刪掉清單也不會把這一格收回。
          </p>
          <button
            type="button"
            className="wire-btn wire-btn-primary"
            onClick={() => {
              const result = store.buySlot();
              setBlockError(result.ok ? "" : result.reason);
            }}
          >
            用 {POINTS_PER_SLOT} 點永久加一格
          </button>
          <button type="button" data-testid="grant-points" className="wire-btn" onClick={store.grantDemoPoints}>
            線框暫代購買：加 {POINTS_PER_SLOT} 點
          </button>
          <ErrorText>{blockError}</ErrorText>
        </main>
      </Phone>
    );
  }

  function patch(partial: Partial<Draft>) {
    writeDraft({ ...draft, ...partial });
  }

  function abandon() {
    if (!window.confirm("要放棄這份還沒完成的清單嗎？")) return;
    clearDraft();
    router.push("/");
  }

  function lockMode() {
    if (!draft.mode) {
      patch({ error: "請先選一種模式" });
      return;
    }
    patch({ modeLocked: true, step: "map", startDate: draft.startDate || todayISO(), error: "" });
  }

  function saveBasics() {
    const days = Number(draft.days);
    const country = draft.country.trim();
    const city = draft.city.trim();
    if (!country) {
      patch({ error: "請填國家" });
      return;
    }
    if (!city) {
      patch({ error: "請填城市" });
      return;
    }
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      patch({ error: "天數要是 1 到 365 的整數" });
      return;
    }
    if (!isIsoDate(draft.startDate)) {
      patch({ error: "請選出發日" });
      return;
    }
    patch({
      location: `${country} ${city}`,
      step: draft.mode === "template" ? "preset" : "bags",
      error: "",
    });
  }

  function saveMap() {
    const country = draft.country.trim();
    const city = draft.city.trim();
    if (!country) {
      patch({ error: "請在地圖上點一個地點，或手動填國家" });
      return;
    }
    if (!city) {
      patch({ error: "請在地圖上點一個地點，或手動填城市" });
      return;
    }
    patch({
      country,
      city,
      location: `${country} ${city}`,
      step: "basics",
      error: "",
    });
  }

  function addWornBag() {
    patch({
      bags: [
        ...draft.bags,
        {
          localId: crypto.randomUUID(),
          name: bagLabel(draft.bagType),
          type: draft.bagType,
          color: draft.bagColor,
        },
      ],
      editingBagId: null,
      error: "",
    });
  }

  function applyPreset(preset: TripPreset) {
    const bags = preset.bags.map((bag) => ({
      localId: crypto.randomUUID(),
      name: bag.name,
      type: bag.type,
      color: bag.color,
      itemIds: bag.itemIds,
    }));
    patch({
      presetId: preset.id,
      country: draft.country.trim() || preset.country,
      days: String(preset.days),
      location: `${draft.country.trim() || preset.country} ${draft.city.trim()}`,
      bags: bags.map(({ localId, name, type, color }) => ({ localId, name, type, color })),
      selections: bags.flatMap((bag) =>
        bag.itemIds.map((itemId) => ({
          localId: crypto.randomUUID(),
          itemId,
          customName: null,
          categoryId: systemItems.find((item) => item.id === itemId)?.categoryId ?? systemCategories[0].id,
          bagLocalId: bag.localId,
        })),
      ),
      templateApplied: true,
      step: "bags",
      error: "",
    });
  }

  function applyGenerated() {
    const days = Number(draft.days);
    if (!Number.isInteger(days) || days < 1) {
      patch({ error: "請先確認天數" });
      return;
    }
    if (draft.travelTypes.length === 0) {
      patch({ error: "至少選一種旅行類型" });
      return;
    }
    const generated = generatePackingList({
      countryName: draft.country.trim(),
      startDate: draft.startDate,
      days,
      types: draft.travelTypes,
      luggage: draft.luggage,
      climate: "auto",
    });
    const bags = generated.bags.map((bag) => ({
      localId: crypto.randomUUID(),
      name: bag.name,
      type: bag.type,
      color: bag.color,
    }));
    patch({
      presetId: "rules-engine",
      bags,
      selections: generated.items.map((item) => ({
        localId: crypto.randomUUID(),
        itemId: null,
        customName: item.customName,
        categoryId: item.categoryId,
        bagLocalId: bags[item.bagIndex]?.localId ?? bags[0].localId,
        tags: item.tags,
        note: item.note,
      })),
      templateApplied: true,
      step: "bags",
      error: "",
    });
  }

  function saveBag() {
    if (!draft.bagName.trim()) {
      patch({ error: "包包要有名稱" });
      return;
    }
    const nextBag = {
      localId: draft.editingBagId ?? crypto.randomUUID(),
      name: draft.bagName.trim(),
      type: draft.bagType,
      color: draft.bagColor,
    };
    const bags = draft.editingBagId
      ? draft.bags.map((bag) => (bag.localId === draft.editingBagId ? nextBag : bag))
      : [...draft.bags, nextBag];
    patch({ bags, step: "bags", editingBagId: null, error: "" });
  }

  function removeBag(localId: string) {
    if (!window.confirm("拿掉這個包包後，裡面已選的物品會取消勾選。")) return;
    patch({
      bags: draft.bags.filter((bag) => bag.localId !== localId),
      selections: draft.selections.filter((selection) => selection.bagLocalId !== localId),
      editingBagId: draft.editingBagId === localId ? null : draft.editingBagId,
    });
  }

  function goItems() {
    if (draft.bags.length < 1) {
      patch({ error: "至少要一個包包" });
      return;
    }
    if (draft.mode === "template" && !draft.templateApplied) {
      patch({ error: "請先產生通用範本清單" });
      return;
    }
    patch({ step: "items", error: "" });
  }

  function assignBag(bagLocalId: string) {
    if (draft.batch) {
      if (draft.batchSelected.length === 0) {
        patch({ error: "請先勾選物品" });
        return;
      }
      const selections = draft.selections.map((selection) =>
        draft.batchSelected.includes(selectionKey(selection))
          ? { ...selection, bagLocalId }
          : selection,
      );
      for (const key of draft.batchSelected) {
        if (!key.startsWith("item:")) continue;
        const itemId = key.slice(5);
        if (selections.some((selection) => selection.itemId === itemId)) continue;
        const item = systemItems.find((entry) => entry.id === itemId);
        if (!item) continue;
        selections.push({
          localId: crypto.randomUUID(),
          itemId,
          customName: null,
          categoryId: item.categoryId,
          bagLocalId,
        });
      }
      patch({ selections, batch: false, batchSelected: [], pendingKey: null, error: "" });
      return;
    }

    if (draft.pendingKey?.startsWith("item:")) {
      const itemId = draft.pendingKey.slice(5);
      const item = systemItems.find((entry) => entry.id === itemId);
      if (!item) return;
      patch({
        selections: [
          ...draft.selections,
          {
            localId: crypto.randomUUID(),
            itemId,
            customName: null,
            categoryId: item.categoryId,
            bagLocalId,
          },
        ],
        pendingKey: null,
        error: "",
      });
      return;
    }

    if (draft.pendingKey?.startsWith("custom:")) {
      const [name, categoryId] = draft.pendingKey.slice(7).split("@@");
      patch({
        selections: [
          ...draft.selections,
          {
            localId: crypto.randomUUID(),
            itemId: null,
            customName: name,
            categoryId,
            bagLocalId,
          },
        ],
        pendingKey: null,
        customItemName: "",
        error: "",
      });
      return;
    }

    if (draft.rebindingId) {
      patch({
        selections: draft.selections.map((selection) =>
          selection.localId === draft.rebindingId ? { ...selection, bagLocalId } : selection,
        ),
        rebindingId: null,
        error: "",
      });
    }
  }

  function toggleItem(itemId: string) {
    if (draft.pendingKey) {
      patch({ error: "請先把正在分配的物品放進包包" });
      return;
    }
    const key = `item:${itemId}`;
    if (draft.batch) {
      const batchSelected = draft.batchSelected.includes(key)
        ? draft.batchSelected.filter((entry) => entry !== key)
        : [...draft.batchSelected, key];
      patch({ batchSelected, error: "" });
      return;
    }
    const existing = draft.selections.find((selection) => selection.itemId === itemId);
    if (existing) {
      patch({
        selections: draft.selections.filter((selection) => selection.localId !== existing.localId),
        rebindingId: draft.rebindingId === existing.localId ? null : draft.rebindingId,
        error: "",
      });
      return;
    }
    patch({ pendingKey: key, rebindingId: null, error: "" });
  }

  function addCustom() {
    const name = draft.customItemName.trim();
    if (!name) {
      patch({ error: "請填自訂物品名稱" });
      return;
    }
    if (draft.pendingKey) {
      patch({ error: "請先把正在分配的物品放進包包" });
      return;
    }
    patch({ pendingKey: `custom:${name}@@${draft.customItemCategoryId}`, error: "" });
  }

  function moveCategory(categoryId: string, direction: -1 | 1) {
    const order = [...draft.categoryOrder];
    const index = order.indexOf(categoryId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= order.length) return;
    const [removed] = order.splice(index, 1);
    order.splice(target, 0, removed);
    patch({ categoryOrder: order });
  }

  function hideCategory(categoryId: string) {
    if (categories.length <= 1) {
      patch({ error: "至少留一個分類" });
      return;
    }
    patch({
      hiddenCategoryIds: [...draft.hiddenCategoryIds, categoryId],
      selections: draft.selections.filter((selection) => selection.categoryId !== categoryId),
      error: "",
    });
  }

  function addCategory() {
    const name = draft.newCategoryName.trim();
    if (!name) {
      patch({ error: "請填分類名稱" });
      return;
    }
    const id = crypto.randomUUID();
    const category: Category = {
      id,
      name,
      isSystem: false,
      userId: store.user?.id ?? null,
      sortOrder: draft.categoryOrder.length,
    };
    patch({
      customCategories: [...draft.customCategories, category],
      categoryOrder: [...draft.categoryOrder, id],
      newCategoryName: "",
      error: "",
    });
  }

  function finish() {
    if (!draft.mode || !store.user) return;
    const visibleCategoryIds = new Set(categories.map((category) => category.id));
    const items = draft.selections
      .filter((selection) => visibleCategoryIds.has(selection.categoryId))
      .map((selection) => ({
        itemId: selection.itemId,
        customName: selection.customName,
        categoryId: selection.categoryId,
        bagIndex: draft.bags.findIndex((bag) => bag.localId === selection.bagLocalId),
        tags: selection.tags ?? [],
        note: selection.note ?? "",
      }));
    const result = store.commit({
      mode: draft.mode,
      location: draft.location,
      days: Number(draft.days),
      purpose: draft.purpose,
      name: draft.name,
      startDate: draft.startDate,
      bags: draft.bags.map((bag) => ({ name: bag.name, type: bag.type, color: bag.color })),
      categories: categories.map((category, index) => ({
        id: category.id,
        name: category.name,
        isSystem: category.isSystem,
        sortOrder: index,
        collapseChecked: draft.collapsedCategoryIds.includes(category.id),
      })),
      items,
    });
    if (!result.ok) {
      patch({ error: result.reason });
      return;
    }
    clearDraft();
    router.push("/");
  }

  const quoteText = `這次會佔用一個旅程欄位，完成後還剩 ${Math.max(0, store.quote.openSlots - 1)} 格。點數只用來永久加欄位，建立本身不扣點。`;

  return (
    <Phone
      fill={draft.step === "map"}
      header={
        <header className="flex items-center justify-between gap-3 border-b-2 border-black px-4 py-3">
          <h1 className="text-lg font-black">{stepTitle(draft.step)}</h1>
          <button type="button" className="text-sm underline" onClick={abandon}>
            放棄
          </button>
        </header>
      }
    >
      <main
        className={draft.step === "map" ? "map-screen" : "flex flex-col gap-3 p-4"}
        style={draft.step === "map" ? { position: "relative", height: "100%" } : undefined}
      >
        {draft.step !== "map" && (
          <>
            <p className="text-xs leading-5">{quoteText}</p>
            {draft.modeLocked && draft.mode && (
              <p className="text-xs font-bold">模式：{draft.mode === "detail" ? "細節控" : "通用範本"}，不能改</p>
            )}
            <ErrorText>{draft.error}</ErrorText>
          </>
        )}
        {draft.step === "mode" && (
          <>
            <button
              type="button"
              data-testid="mode-detail"
              aria-pressed={draft.mode === "detail"}
              className={`wire-btn ${draft.mode === "detail" ? "wire-btn-primary" : ""}`}
              onClick={() => patch({ mode: "detail", error: "" })}
            >
              細節控
              <span className="mt-1 block text-sm font-normal">完整自己勾，大約 10 分鐘</span>
            </button>
            <button
              type="button"
              data-testid="mode-template"
              aria-pressed={draft.mode === "template"}
              className={`wire-btn ${draft.mode === "template" ? "wire-btn-primary" : ""}`}
              onClick={() => patch({ mode: "template", error: "" })}
            >
              通用範本
              <span className="mt-1 block text-sm font-normal">依地點和天數產生，大約 1 分鐘，之後還能改</span>
            </button>
            <button type="button" data-testid="mode-lock" className="wire-btn wire-btn-primary" onClick={lockMode}>
              確定使用這個模式
            </button>
            <p className="text-xs">按下去之後不能改成另一種模式。</p>
          </>
        )}

        {draft.step === "map" && (
          <>
            <DestinationMap
              onPick={(country, city) => patch({ country, city, location: `${country} ${city}`, error: "" })}
            />
            <form
              className="map-sheet"
              style={{
                position: "absolute",
                left: 12,
                right: 12,
                bottom: 12,
                zIndex: 2,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                border: "2px solid #111111",
                background: "#fffdf6",
                padding: 12,
              }}
              onSubmit={(event) => {
                event.preventDefault();
                saveMap();
              }}
            >
              <p className="text-sm font-bold">
                {draft.country && draft.city ? `${draft.country} · ${draft.city}` : "點圓點選地點，或直接打字"}
              </p>
              <ErrorText>{draft.error}</ErrorText>
              <label className="wire-field">
                國家
                <input data-testid="field-country" value={draft.country} onChange={(event) => patch({ country: event.target.value })} />
              </label>
              <label className="wire-field">
                城市
                <input data-testid="field-city" value={draft.city} onChange={(event) => patch({ city: event.target.value })} />
              </label>
              <button type="submit" className="wire-btn wire-btn-primary">下一步：天數</button>
            </form>
          </>
        )}

        {draft.step === "basics" && (
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              saveBasics();
            }}
          >
            <p className="text-sm leading-6">地點來自上一頁的地圖，這裡還能改。</p>
            <label className="wire-field">
              國家
              <input data-testid="field-country" value={draft.country} onChange={(event) => patch({ country: event.target.value })} required />
            </label>
            <label className="wire-field">
              城市
              <input data-testid="field-city" value={draft.city} onChange={(event) => patch({ city: event.target.value })} required />
            </label>
            <label className="wire-field">
              天數
              <input data-testid="field-days" inputMode="numeric" value={draft.days} onChange={(event) => patch({ days: event.target.value })} required />
            </label>
            <label className="wire-field">
              出發日
              <input
                data-testid="field-start"
                type="date"
                value={draft.startDate}
                onChange={(event) => patch({ startDate: event.target.value })}
                required
              />
            </label>
            <label className="wire-field">
              目的（選填）
              <input data-testid="field-purpose" value={draft.purpose} onChange={(event) => patch({ purpose: event.target.value })} />
            </label>
            <button type="submit" className="wire-btn wire-btn-primary">下一步：包包</button>
          </form>
        )}

        {draft.step === "preset" && (
          <>
            <p className="text-sm leading-6">
              依目的地氣候、天數與旅行類型自動產生包包與物品。產生後還可以再加、再改。
            </p>
            <fieldset className="wire-card flex flex-col gap-2">
              <legend className="px-1 text-sm font-bold">旅行類型（可複選）</legend>
              <div className="flex flex-wrap gap-2">
                {TRAVEL_TYPES.map((type) => {
                  const pressed = draft.travelTypes.includes(type.id);
                  return (
                    <button
                      key={type.id}
                      type="button"
                      className={`wire-btn ${pressed ? "wire-btn-primary" : ""}`}
                      aria-pressed={pressed}
                      onClick={() => {
                        const travelTypes = pressed
                          ? draft.travelTypes.filter((entry) => entry !== type.id)
                          : [...draft.travelTypes, type.id];
                        patch({ travelTypes, error: "" });
                      }}
                    >
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <fieldset className="wire-card flex flex-col gap-2">
              <legend className="px-1 text-sm font-bold">行李方案</legend>
              {LUGGAGE_PLANS.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  className={`wire-btn ${draft.luggage === plan.id ? "wire-btn-primary" : ""}`}
                  aria-pressed={draft.luggage === plan.id}
                  onClick={() => patch({ luggage: plan.id, error: "" })}
                >
                  {plan.label}
                </button>
              ))}
            </fieldset>
            <button type="button" data-testid="generate-template" className="wire-btn wire-btn-primary" onClick={applyGenerated}>
              產生清單
            </button>
            {tripPresets.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-bold">或選你自己存的行程</p>
                {tripPresets.map((preset) => (
                  <button key={preset.id} type="button" className="wire-btn" onClick={() => applyPreset(preset)}>
                    {preset.name}
                    <span className="mt-1 block text-xs font-normal">{preset.summary}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {draft.step === "bags" && (
          <>
            <p className="text-sm leading-6">
              {draft.mode === "detail"
                ? "從零開始。選種類，按加號。右邊一開始是空白，加了才會出現名稱和圖示。"
                : "預設行程已在右邊。還可以再加。"}
            </p>
            <BagStudio
              bags={draft.bags}
              bagType={draft.bagType}
              editingBagId={draft.editingBagId}
              onSelectType={(bagType) => patch({ bagType, bagName: bagLabel(bagType), error: "" })}
              onAdd={addWornBag}
              onWear={(localId) => {
                const bag = draft.bags.find((entry) => entry.localId === localId);
                if (!bag) return;
                patch({
                  editingBagId: localId,
                  bagName: bag.name,
                  bagType: bag.type,
                  bagColor: bag.color,
                  error: "",
                });
              }}
            />
            {draft.editingBagId && (
              <form
                className="wire-card flex flex-col gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  saveBag();
                }}
              >
                <label className="wire-field">
                  名稱
                  <input data-testid="field-bag-name" value={draft.bagName} onChange={(event) => patch({ bagName: event.target.value })} required />
                </label>
                <button type="submit" className="wire-btn wire-btn-primary">儲存這個包包</button>
                <button type="button" className="wire-btn" onClick={() => removeBag(draft.editingBagId!)}>
                  刪除這個包包
                </button>
              </form>
            )}
            <button type="button" data-testid="to-items" className="wire-btn wire-btn-primary" onClick={goItems}>
              下一步：物品
            </button>
          </>
        )}

        {draft.step === "bag-form" && (
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              saveBag();
            }}
          >
            <label className="wire-field">
              類型
              <select
                value={draft.bagType}
                onChange={(event) => {
                  const bagType = event.target.value as BagType;
                  patch({
                    bagType,
                    bagName: draft.editingBagId ? draft.bagName : bagLabel(bagType),
                  });
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
              <input data-testid="field-bag-name" value={draft.bagName} onChange={(event) => patch({ bagName: event.target.value })} required />
            </label>
            <button type="submit" data-testid="save-bag" className="wire-btn wire-btn-primary">
              儲存包包
            </button>
            <button type="button" className="wire-btn" onClick={() => patch({ step: "bags", error: "" })}>
              返回包包列表
            </button>
          </form>
        )}

        {draft.step === "items" && (
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
            {draft.mode === "template" && (
              <p className="text-sm">預設行程帶進來的物品可以改，也可以再加。</p>
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
              <button type="submit" className="wire-btn">加入並分配</button>
            </form>
            {draft.pendingKey?.startsWith("custom:") && (
              <BagPicker
                bags={draft.bags.map((bag) => ({ id: bag.localId, name: bag.name, type: bag.type, color: bag.color }))}
                onPick={assignBag}
              />
            )}
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
        )}

        {draft.step === "name" && (
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              finish();
            }}
          >
            <label className="wire-field">
              清單名稱
              <input data-testid="field-list-name" value={draft.name} onChange={(event) => patch({ name: event.target.value })} required />
            </label>
            <button type="submit" data-testid="finish-list" className="wire-btn wire-btn-primary">
              完成，回到主頁
            </button>
          </form>
        )}
      </main>
    </Phone>
  );
}

function selectionKey(selection: DraftSelection): string {
  return selection.itemId ? `item:${selection.itemId}` : `custom-row:${selection.localId}`;
}

function stepTitle(step: Step): string {
  switch (step) {
    case "mode":
      return "選擇模式";
    case "map":
      return "選擇地點";
    case "basics":
      return "旅程資料";
    case "preset":
      return "預設行程";
    case "bags":
      return "包包";
    case "bag-form":
      return "包包細節";
    case "items":
      return "物品與分配";
    case "name":
      return "命名清單";
  }
}
