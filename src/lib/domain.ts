import { FREE_JOURNEY_LIMIT, POINTS_PER_SLOT } from "@/lib/constants";
import { addDays, isIsoDate } from "@/lib/dates";
import { systemCategories, systemItems } from "@/lib/seed";
import type {
  AppState,
  Bag,
  Journey,
  JourneyItem,
  NewJourneyInput,
  Quote,
  Result,
  SharePermission,
  User,
} from "@/lib/types";

export const DEMO_USERS: User[] = [
  {
    id: "demo-traveler-a",
    name: "旅人甲",
    email: "traveler-a@example.com",
    points: 0,
    slotCapacity: FREE_JOURNEY_LIMIT,
  },
  {
    id: "demo-traveler-b",
    name: "旅人乙",
    email: "traveler-b@example.com",
    points: 0,
    slotCapacity: FREE_JOURNEY_LIMIT,
  },
];

export function createInitialState(): AppState {
  return {
    users: DEMO_USERS.map((user) => ({ ...user })),
    sessionUserId: null,
    categories: systemCategories.map((category) => ({ ...category })),
    items: systemItems.map((item) => ({ ...item })),
    journeys: [],
    bags: [],
    journeyItems: [],
    journeyCategories: [],
    shares: [],
    shareMembers: [],
  };
}

export function ownedJourneyCount(state: AppState, userId: string): number {
  return state.journeys.filter((journey) => journey.ownerId === userId).length;
}

export function quoteCreate(user: User, ownedJourneys: number): Quote {
  const openSlots = user.slotCapacity - ownedJourneys;
  if (openSlots > 0) return { allowed: true, openSlots };
  return {
    allowed: false,
    openSlots: 0,
    reason: `旅程欄位已滿。${POINTS_PER_SLOT} 點可以永久再加一格。`,
  };
}

export function travelDays(state: AppState, userId: string): number {
  return state.journeys
    .filter((journey) => journey.ownerId === userId)
    .reduce((sum, journey) => sum + journey.days, 0);
}

export function buySlot(state: AppState, userId: string): Result<{ state: AppState }> {
  const user = state.users.find((entry) => entry.id === userId);
  if (!user) return { ok: false, reason: "請先登入" };
  if (user.points < POINTS_PER_SLOT) return { ok: false, reason: `點數不足，還需要 ${POINTS_PER_SLOT} 點` };
  return {
    ok: true,
    state: {
      ...state,
      users: state.users.map((entry) =>
        entry.id === userId
          ? { ...entry, points: entry.points - POINTS_PER_SLOT, slotCapacity: entry.slotCapacity + 1 }
          : entry,
      ),
    },
  };
}

export function visibleJourneys(state: AppState, userId: string) {
  const owned = state.journeys
    .filter((journey) => journey.ownerId === userId)
    .map((journey) => ({ journey, shared: false }));
  const memberShareIds = new Set(
    state.shareMembers.filter((member) => member.userId === userId).map((member) => member.shareId),
  );
  const shared = state.shares
    .filter(
      (share) =>
        share.permission === "editable" &&
        share.createdBy !== userId &&
        memberShareIds.has(share.id),
    )
    .map((share) => state.journeys.find((journey) => journey.id === share.journeyId))
    .filter((journey): journey is Journey => Boolean(journey))
    .map((journey) => ({ journey, shared: true }));
  return [...owned, ...shared].sort((a, b) => a.journey.createdAt.localeCompare(b.journey.createdAt));
}

export function bagsFor(state: AppState, journeyId: string): Bag[] {
  return state.bags
    .filter((bag) => bag.journeyId === journeyId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export function itemsFor(state: AppState, journeyId: string): JourneyItem[] {
  return state.journeyItems
    .filter((item) => item.journeyId === journeyId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function journeyItemName(state: AppState, item: JourneyItem): string {
  if (item.customName) return item.customName;
  return state.items.find((catalog) => catalog.id === item.itemId)?.name ?? "未命名物品";
}

export function canEditJourney(state: AppState, userId: string, journeyId: string): boolean {
  const journey = state.journeys.find((entry) => entry.id === journeyId);
  if (!journey) return false;
  if (journey.ownerId === userId) return true;
  const share = state.shares.find(
    (entry) => entry.journeyId === journeyId && entry.permission === "editable",
  );
  if (!share) return false;
  return state.shareMembers.some((member) => member.shareId === share.id && member.userId === userId);
}

export function grantPoints(
  state: AppState,
  userId: string,
  amount: number,
): Result<{ state: AppState }> {
  if (!Number.isInteger(amount) || amount <= 0) return { ok: false, reason: "點數不正確" };
  const user = state.users.find((entry) => entry.id === userId);
  if (!user) return { ok: false, reason: "請先登入" };
  if (user.demoPointsClaimed) return { ok: false, reason: "示範點已領過，每位帳號限一次" };
  return {
    ok: true,
    state: {
      ...state,
      users: state.users.map((entry) =>
        entry.id === userId
          ? { ...entry, points: entry.points + amount, demoPointsClaimed: true }
          : entry,
      ),
    },
  };
}

export function adoptUser(
  state: AppState,
  profile: { id: string; name: string; email: string },
): AppState {
  const existing = state.users.find((user) => user.id === profile.id);
  const users = existing
    ? state.users.map((user) =>
        user.id === profile.id ? { ...user, name: profile.name, email: profile.email } : user,
      )
    : [
        ...state.users,
        {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          points: 0,
          slotCapacity: FREE_JOURNEY_LIMIT,
        },
      ];
  return { ...state, users, sessionUserId: profile.id };
}

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

export function setSharePermission(
  state: AppState,
  userId: string,
  journeyId: string,
  permission: SharePermission,
): Result<{ state: AppState; token: string }> {
  const journey = state.journeys.find((entry) => entry.id === journeyId);
  if (!journey) return { ok: false, reason: "找不到清單" };
  if (journey.ownerId !== userId) return { ok: false, reason: "只有建立者能分享" };

  const existing = state.shares.find((share) => share.journeyId === journeyId);
  if (!existing) {
    const share = {
      id: crypto.randomUUID(),
      journeyId,
      token: crypto.randomUUID().replaceAll("-", ""),
      permission,
      createdBy: userId,
    };
    return {
      ok: true,
      token: share.token,
      state: { ...state, shares: [...state.shares, share] },
    };
  }

  return {
    ok: true,
    token: existing.token,
    state: {
      ...state,
      shares: state.shares.map((share) =>
        share.id === existing.id ? { ...share, permission } : share,
      ),
      shareMembers:
        permission === "read_only"
          ? state.shareMembers.filter((member) => member.shareId !== existing.id)
          : state.shareMembers,
    },
  };
}

export function openShare(
  state: AppState,
  userId: string,
  token: string,
): Result<{ state: AppState; journeyId: string; permission: SharePermission }> {
  const share = state.shares.find((entry) => entry.token === token);
  if (!share) return { ok: false, reason: "找不到這份分享" };
  if (share.permission !== "editable" || share.createdBy === userId) {
    return { ok: true, state, journeyId: share.journeyId, permission: share.permission };
  }
  const joined = state.shareMembers.some(
    (member) => member.shareId === share.id && member.userId === userId,
  );
  if (joined) {
    return { ok: true, state, journeyId: share.journeyId, permission: share.permission };
  }
  return {
    ok: true,
    journeyId: share.journeyId,
    permission: share.permission,
    state: {
      ...state,
      shareMembers: [...state.shareMembers, { shareId: share.id, userId }],
    },
  };
}

export function hydrateState(raw: unknown): AppState {
  const initial = createInitialState();
  if (!raw || typeof raw !== "object") return initial;
  const parsed = raw as Partial<AppState>;
  const customCategories = Array.isArray(parsed.categories)
    ? parsed.categories.filter((category) => category && category.isSystem === false)
    : [];
  const savedUsers = Array.isArray(parsed.users) ? parsed.users : [];
  const journeys = Array.isArray(parsed.journeys) ? parsed.journeys : [];
  const users = mergeUsers(savedUsers).map((user) => ({
    ...user,
    slotCapacity: Math.max(user.slotCapacity, ownedJourneyCount({ ...initial, journeys }, user.id)),
  }));
  const sessionUserId = users.some((user) => user.id === parsed.sessionUserId)
    ? parsed.sessionUserId ?? null
    : null;

  return {
    users,
    sessionUserId,
    categories: [
      ...initial.categories,
      ...customCategories.filter(
        (category) => !initial.categories.some((system) => system.id === category.id),
      ),
    ],
    items: initial.items,
    journeys,
    bags: Array.isArray(parsed.bags)
      ? parsed.bags.map((bag) => ({ ...bag, sealed: Boolean(bag?.sealed) }))
      : [],
    journeyItems: Array.isArray(parsed.journeyItems)
      ? parsed.journeyItems.map((item) => ({
          ...item,
          tags: Array.isArray(item?.tags) ? item.tags : [],
          note: typeof item?.note === "string" ? item.note : "",
        }))
      : [],
    journeyCategories: Array.isArray(parsed.journeyCategories) ? parsed.journeyCategories : [],
    shares: Array.isArray(parsed.shares) ? parsed.shares : [],
    shareMembers: Array.isArray(parsed.shareMembers) ? parsed.shareMembers : [],
  };
}

function mergeUsers(saved: User[]): User[] {
  const byId = new Map(DEMO_USERS.map((user) => [user.id, { ...user }]));
  for (const user of saved) {
    if (!user?.id) continue;
    const previous = byId.get(user.id);
    const merged = previous ? { ...previous, ...user, id: user.id } : user;
    byId.set(user.id, {
      ...merged,
      slotCapacity:
        Number.isInteger(merged.slotCapacity) && merged.slotCapacity >= FREE_JOURNEY_LIMIT
          ? merged.slotCapacity
          : FREE_JOURNEY_LIMIT,
    });
  }
  return [...byId.values()];
}

function canReadWithToken(state: AppState, userId: string, journey: Journey, token?: string): boolean {
  if (journey.ownerId === userId) return true;
  const share = state.shares.find((entry) => entry.journeyId === journey.id);
  if (!share) return false;
  if (token && share.token === token) return true;
  return (
    share.permission === "editable" &&
    state.shareMembers.some((member) => member.shareId === share.id && member.userId === userId)
  );
}
