import type { AppState, Bag, Result } from "@/lib/types";
import { bagsFor, canEditJourney, itemsFor } from "@/lib/domain/queries";

export function addBag(
  state: AppState,
  userId: string,
  journeyId: string,
  bag: Pick<Bag, "name" | "type" | "color">,
): Result<{ state: AppState; id: string }> {
  if (!canEditJourney(state, userId, journeyId)) return { ok: false, reason: "你沒有編輯權限" };
  if (!bag.name.trim()) return { ok: false, reason: "包包要有名稱" };
  const sortOrder = bagsFor(state, journeyId).length;
  const id = crypto.randomUUID();
  return {
    ok: true,
    id,
    state: {
      ...state,
      bags: [
        ...state.bags,
        { id, journeyId, name: bag.name.trim(), type: bag.type, color: bag.color, sortOrder, sealed: false },
      ],
    },
  };
}

export function setBagSealed(
  state: AppState,
  userId: string,
  bagId: string,
  sealed: boolean,
): Result<{ state: AppState }> {
  const bag = state.bags.find((entry) => entry.id === bagId);
  if (!bag) return { ok: false, reason: "找不到包包" };
  if (!canEditJourney(state, userId, bag.journeyId)) return { ok: false, reason: "你沒有編輯權限" };
  return {
    ok: true,
    state: {
      ...state,
      bags: state.bags.map((entry) => (entry.id === bagId ? { ...entry, sealed } : entry)),
    },
  };
}

export function addJourneyItem(
  state: AppState,
  userId: string,
  input: {
    journeyId: string;
    bagId: string;
    itemId: string | null;
    customName: string | null;
    categoryId: string;
  },
): Result<{ state: AppState }> {
  if (!canEditJourney(state, userId, input.journeyId)) return { ok: false, reason: "你沒有編輯權限" };
  const bag = state.bags.find((entry) => entry.id === input.bagId && entry.journeyId === input.journeyId);
  if (!bag) return { ok: false, reason: "找不到包包" };
  if (input.itemId && state.journeyItems.some((item) => item.journeyId === input.journeyId && item.itemId === input.itemId)) {
    return { ok: false, reason: "這項已經在清單裡" };
  }
  const customName = input.customName?.trim() || null;
  if (!input.itemId && !customName) return { ok: false, reason: "請填物品名稱" };
  if (!state.categories.some((category) => category.id === input.categoryId)) {
    return { ok: false, reason: "找不到分類" };
  }
  const sortOrder = itemsFor(state, input.journeyId).length;
  return {
    ok: true,
    state: {
      ...state,
      journeyItems: [
        ...state.journeyItems,
        {
          id: crypto.randomUUID(),
          journeyId: input.journeyId,
          itemId: input.itemId,
          customName,
          categoryId: input.categoryId,
          bagId: input.bagId,
          isChecked: false,
          sortOrder,
          tags: [],
          note: "",
        },
      ],
    },
  };
}

export function moveJourneyItem(
  state: AppState,
  userId: string,
  journeyItemId: string,
  bagId: string,
): Result<{ state: AppState }> {
  const item = state.journeyItems.find((entry) => entry.id === journeyItemId);
  if (!item) return { ok: false, reason: "找不到物品" };
  if (!canEditJourney(state, userId, item.journeyId)) return { ok: false, reason: "你沒有編輯權限" };
  const bag = state.bags.find((entry) => entry.id === bagId && entry.journeyId === item.journeyId);
  if (!bag) return { ok: false, reason: "找不到包包" };
  return {
    ok: true,
    state: {
      ...state,
      journeyItems: state.journeyItems.map((entry) =>
        entry.id === journeyItemId ? { ...entry, bagId } : entry,
      ),
    },
  };
}

export function togglePacked(
  state: AppState,
  userId: string,
  journeyItemId: string,
): Result<{ state: AppState }> {
  const item = state.journeyItems.find((entry) => entry.id === journeyItemId);
  if (!item) return { ok: false, reason: "找不到物品" };
  if (!canEditJourney(state, userId, item.journeyId)) return { ok: false, reason: "你沒有編輯權限" };
  const bag = state.bags.find((entry) => entry.id === item.bagId);
  if (bag?.sealed) return { ok: false, reason: "這個包包已封箱，先開箱才能改勾選" };
  return {
    ok: true,
    state: {
      ...state,
      journeyItems: state.journeyItems.map((entry) =>
        entry.id === journeyItemId ? { ...entry, isChecked: !entry.isChecked } : entry,
      ),
    },
  };
}

export function removeJourneyItem(
  state: AppState,
  userId: string,
  journeyItemId: string,
): Result<{ state: AppState }> {
  const item = state.journeyItems.find((entry) => entry.id === journeyItemId);
  if (!item) return { ok: false, reason: "找不到物品" };
  if (!canEditJourney(state, userId, item.journeyId)) return { ok: false, reason: "你沒有編輯權限" };
  return {
    ok: true,
    state: {
      ...state,
      journeyItems: state.journeyItems.filter((entry) => entry.id !== journeyItemId),
    },
  };
}

export function updateItemNote(
  state: AppState,
  userId: string,
  journeyItemId: string,
  note: string,
): Result<{ state: AppState }> {
  const item = state.journeyItems.find((entry) => entry.id === journeyItemId);
  if (!item) return { ok: false, reason: "找不到物品" };
  if (!canEditJourney(state, userId, item.journeyId)) return { ok: false, reason: "你沒有編輯權限" };
  const bag = state.bags.find((entry) => entry.id === item.bagId);
  if (bag?.sealed) return { ok: false, reason: "這個包包已封箱，先開箱才能改備註" };
  return {
    ok: true,
    state: {
      ...state,
      journeyItems: state.journeyItems.map((entry) =>
        entry.id === journeyItemId ? { ...entry, note: note.trim() } : entry,
      ),
    },
  };
}
