import { POINTS_PER_SLOT } from "@/lib/constants";
import type { AppState, Journey, Quote, Result, User } from "@/lib/types";

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
