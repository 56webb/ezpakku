import type { AppState, Bag, Journey, JourneyItem } from "@/lib/types";

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

export function canReadWithToken(
  state: AppState,
  userId: string,
  journey: Journey,
  token?: string,
): boolean {
  if (journey.ownerId === userId) return true;
  const share = state.shares.find((entry) => entry.journeyId === journey.id);
  if (!share) return false;
  if (token && share.token === token) return true;
  return (
    share.permission === "editable" &&
    state.shareMembers.some((member) => member.shareId === share.id && member.userId === userId)
  );
}
