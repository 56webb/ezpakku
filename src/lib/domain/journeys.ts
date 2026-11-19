import { addDays, isIsoDate } from "@/lib/dates";
import type { AppState, Journey, NewJourneyInput, Result } from "@/lib/types";
import { bagsFor, canEditJourney, canReadWithToken, itemsFor } from "@/lib/domain/queries";
import { ownedJourneyCount, quoteCreate } from "@/lib/domain/slots";

export function commitJourney(
  state: AppState,
  userId: string,
  input: NewJourneyInput,
): Result<{ state: AppState; id: string }> {
  const user = state.users.find((entry) => entry.id === userId);
  if (!user) return { ok: false, reason: "請先登入" };

  const location = input.location.trim();
  const name = input.name.trim();
  const purpose = input.purpose.trim();
  if (!location) return { ok: false, reason: "請填地點" };
  if (!name) return { ok: false, reason: "請為清單命名" };
  if (!Number.isInteger(input.days) || input.days < 1 || input.days > 365) {
    return { ok: false, reason: "天數要是 1 到 365 的整數" };
  }
  if (!isIsoDate(input.startDate)) return { ok: false, reason: "出發日不正確" };
  if (input.bags.length < 1) return { ok: false, reason: "至少要一個包包" };
  if (input.bags.some((bag) => !bag.name.trim())) return { ok: false, reason: "每個包包都要有名稱" };
  if (input.mode !== "detail" && input.mode !== "template") {
    return { ok: false, reason: "請選擇模式" };
  }

  const quote = quoteCreate(user, ownedJourneyCount(state, userId));
  if (!quote.allowed) return { ok: false, reason: quote.reason ?? "沒有空的旅程欄位" };

  for (const row of input.items) {
    if (row.bagIndex < 0 || row.bagIndex >= input.bags.length) {
      return { ok: false, reason: "有物品還沒放進包包" };
    }
    if (!row.itemId && !row.customName?.trim()) {
      return { ok: false, reason: "有空白的自訂物品" };
    }
  }

  const journeyId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const bagIds = input.bags.map(() => crypto.randomUUID());
  const customCategories = input.categories.filter((category) => !category.isSystem);
  const knownCategoryIds = new Set([
    ...state.categories.map((category) => category.id),
    ...customCategories.map((category) => category.id),
  ]);

  for (const row of input.items) {
    if (!knownCategoryIds.has(row.categoryId)) {
      return { ok: false, reason: "物品的分類不存在" };
    }
  }

  const journey: Journey = {
    id: journeyId,
    ownerId: userId,
    name,
    location,
    days: input.days,
    purpose,
    startDate: input.startDate,
    endDate: addDays(input.startDate, input.days - 1),
    mode: input.mode,
    createdAt,
  };

  const next: AppState = {
    ...state,
    categories: [
      ...state.categories,
      ...customCategories
        .filter((category) => !state.categories.some((existing) => existing.id === category.id))
        .map((category) => ({
          id: category.id,
          name: category.name.trim(),
          isSystem: false,
          userId,
          sortOrder: category.sortOrder,
        })),
    ],
    journeys: [...state.journeys, journey],
    bags: [
      ...state.bags,
      ...input.bags.map((bag, index) => ({
        id: bagIds[index],
        journeyId,
        name: bag.name.trim(),
        type: bag.type,
        color: bag.color,
        sortOrder: index,
        sealed: false,
      })),
    ],
    journeyItems: [
      ...state.journeyItems,
      ...input.items.map((row, index) => ({
        id: crypto.randomUUID(),
        journeyId,
        itemId: row.itemId,
        customName: row.customName?.trim() || null,
        categoryId: row.categoryId,
        bagId: bagIds[row.bagIndex],
        isChecked: false,
        sortOrder: index,
        tags: row.tags ?? [],
        note: row.note ?? "",
      })),
    ],
    journeyCategories: [
      ...state.journeyCategories,
      ...input.categories.map((category) => ({
        journeyId,
        categoryId: category.id,
        sortOrder: category.sortOrder,
        collapseChecked: category.collapseChecked,
      })),
    ],
  };

  return { ok: true, state: next, id: journeyId };
}

export function copyJourney(
  state: AppState,
  userId: string,
  journeyId: string,
  startDate: string,
  token?: string,
): Result<{ state: AppState; id: string }> {
  const source = state.journeys.find((journey) => journey.id === journeyId);
  if (!source) return { ok: false, reason: "找不到清單" };
  if (!canReadWithToken(state, userId, source, token)) {
    return { ok: false, reason: "你不能複製這份清單" };
  }

  const bags = bagsFor(state, journeyId);
  const categories = state.journeyCategories
    .filter((row) => row.journeyId === journeyId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const categoryRecords = categories.map((row) => {
    const category = state.categories.find((entry) => entry.id === row.categoryId);
    return {
      id: row.categoryId,
      name: category?.name ?? "未命名分類",
      isSystem: category?.isSystem ?? true,
      sortOrder: row.sortOrder,
      collapseChecked: row.collapseChecked,
    };
  });
  const items = itemsFor(state, journeyId).map((item) => ({
    itemId: item.itemId,
    customName: item.customName,
    categoryId: item.categoryId,
    bagIndex: Math.max(0, bags.findIndex((bag) => bag.id === item.bagId)),
    tags: item.tags,
    note: item.note,
  }));

  return commitJourney(state, userId, {
    mode: source.mode,
    location: source.location,
    days: source.days,
    purpose: source.purpose,
    name: `${source.name} 的複製`,
    startDate,
    bags: bags.map((bag) => ({ name: bag.name, type: bag.type, color: bag.color })),
    categories: categoryRecords,
    items,
  });
}

export function deleteJourney(
  state: AppState,
  userId: string,
  journeyId: string,
): Result<{ state: AppState }> {
  const journey = state.journeys.find((entry) => entry.id === journeyId);
  if (!journey) return { ok: false, reason: "找不到清單" };
  if (journey.ownerId !== userId) return { ok: false, reason: "只有建立者能刪除清單" };
  const shareIds = new Set(state.shares.filter((share) => share.journeyId === journeyId).map((share) => share.id));
  return {
    ok: true,
    state: {
      ...state,
      journeys: state.journeys.filter((entry) => entry.id !== journeyId),
      bags: state.bags.filter((bag) => bag.journeyId !== journeyId),
      journeyItems: state.journeyItems.filter((item) => item.journeyId !== journeyId),
      journeyCategories: state.journeyCategories.filter((row) => row.journeyId !== journeyId),
      shares: state.shares.filter((share) => share.journeyId !== journeyId),
      shareMembers: state.shareMembers.filter((member) => !shareIds.has(member.shareId)),
    },
  };
}

export function updateJourneyMeta(
  state: AppState,
  userId: string,
  journeyId: string,
  patch: Partial<Pick<Journey, "name" | "location" | "days" | "purpose" | "startDate">>,
): Result<{ state: AppState }> {
  if (!canEditJourney(state, userId, journeyId)) return { ok: false, reason: "你沒有編輯權限" };
  const journey = state.journeys.find((entry) => entry.id === journeyId);
  if (!journey) return { ok: false, reason: "找不到清單" };

  const name = patch.name !== undefined ? patch.name.trim() : journey.name;
  const location = patch.location !== undefined ? patch.location.trim() : journey.location;
  const purpose = patch.purpose !== undefined ? patch.purpose.trim() : journey.purpose;
  const days = patch.days ?? journey.days;
  const startDate = patch.startDate ?? journey.startDate;
  if (!name) return { ok: false, reason: "清單名稱不能是空白" };
  if (!location) return { ok: false, reason: "地點不能是空白" };
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    return { ok: false, reason: "天數要是 1 到 365 的整數" };
  }
  if (!isIsoDate(startDate)) return { ok: false, reason: "出發日不正確" };

  return {
    ok: true,
    state: {
      ...state,
      journeys: state.journeys.map((entry) =>
        entry.id === journeyId
          ? { ...entry, name, location, purpose, days, startDate, endDate: addDays(startDate, days - 1) }
          : entry,
      ),
    },
  };
}
