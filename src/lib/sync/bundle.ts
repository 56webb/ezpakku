import type { AppState, Journey } from "@/lib/types";

export function journeyBundlePayload(state: AppState, journeyId: string) {
  const journey = state.journeys.find((entry) => entry.id === journeyId);
  if (!journey) return null;
  const bags = state.bags
    .filter((bag) => bag.journeyId === journeyId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const categories = state.journeyCategories
    .filter((row) => row.journeyId === journeyId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const items = state.journeyItems
    .filter((item) => item.journeyId === journeyId)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    meta: {
      name: journey.name,
      location: journey.location,
      purpose: journey.purpose,
      days: journey.days,
      start_date: journey.startDate,
      end_date: journey.endDate,
    },
    bags: bags.map((bag) => ({
      id: bag.id,
      name: bag.name,
      type: bag.type,
      color: bag.color,
      sort_order: bag.sortOrder,
      sealed: bag.sealed,
    })),
    categories: categories.map((row) => ({
      category_id: row.categoryId,
      sort_order: row.sortOrder,
      collapse_checked: row.collapseChecked,
    })),
    items: items.map((item) => ({
      id: item.id,
      item_id: item.itemId,
      custom_name: item.customName,
      category_id: item.categoryId,
      bag_id: item.bagId,
      is_checked: item.isChecked,
      sort_order: item.sortOrder,
      tags: item.tags,
      note: item.note,
    })),
    baseUpdatedAt: journey.updatedAt ?? null,
  };
}

export function touchJourneyUpdatedAt(state: AppState, journeyId: string, iso = new Date().toISOString()): AppState {
  return {
    ...state,
    journeys: state.journeys.map((journey) =>
      journey.id === journeyId ? ({ ...journey, updatedAt: iso } satisfies Journey) : journey,
    ),
  };
}
