import { BAG_COLORS } from "@/lib/constants";
import { systemCategories } from "@/lib/seed";
import { DEFAULT_TRAVELER_ID } from "@/lib/travelers";
import type { BagType, Category, ListMode } from "@/lib/types";
import type { ClimateChoice, LuggagePlan, TravelType } from "@/lib/rules/generator";

export type Step = "mode" | "map" | "basics" | "preset" | "bags" | "bag-form" | "items" | "name";

export type DraftBag = { localId: string; name: string; type: BagType; color: string };
export type DraftSelection = {
  localId: string;
  itemId: string | null;
  customName: string | null;
  categoryId: string;
  bagLocalId: string;
  tags?: string[];
  note?: string;
};

export type Draft = {
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
  weatherClimate: ClimateChoice;
  travelerId: string;
  error: string;
};

export function emptyDraft(): Draft {
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
    weatherClimate: "auto",
    travelerId: DEFAULT_TRAVELER_ID,
    error: "",
  };
}

export function previousStep(draft: Draft): Step | null {
  switch (draft.step) {
    case "mode":
      return null;
    case "map":
      return "mode";
    case "basics":
      return "map";
    case "preset":
      return "basics";
    case "bags":
      return draft.mode === "template" ? "preset" : "basics";
    case "bag-form":
      return "bags";
    case "items":
      return "bags";
    case "name":
      return "items";
  }
}

export function selectionKey(selection: DraftSelection): string {
  return selection.itemId ? `item:${selection.itemId}` : `custom-row:${selection.localId}`;
}

export function stepTitle(step: Step): string {
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
