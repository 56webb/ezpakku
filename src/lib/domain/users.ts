import { FREE_JOURNEY_LIMIT } from "@/lib/constants";
import { systemCategories, systemItems } from "@/lib/seed";
import type { AppState, Result, User } from "@/lib/types";
import { ownedJourneyCount } from "@/lib/domain/slots";

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
