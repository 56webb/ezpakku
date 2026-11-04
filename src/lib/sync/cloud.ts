import { FREE_JOURNEY_LIMIT } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { journeyBundlePayload } from "@/lib/sync/bundle";
import { bumpOutboxTries, listOutbox, removeOutboxJourney } from "@/lib/sync/outbox";
import { getSyncSessionId } from "@/lib/sync/session";
import type { AppState, Bag, BagType, Journey, JourneyCategory, JourneyItem, ListMode, User } from "@/lib/types";

type DbJourney = {
  id: string;
  user_id: string;
  name: string;
  location: string;
  days: number;
  purpose: string | null;
  start_date: string;
  end_date: string;
  mode: ListMode;
  created_at: string;
  updated_at: string;
};

type DbBag = {
  id: string;
  journey_id: string;
  name: string;
  type: BagType;
  color: string;
  sort_order: number;
  sealed: boolean;
};

type DbJourneyItem = {
  id: string;
  journey_id: string;
  item_id: string | null;
  custom_name: string | null;
  category_id: string | null;
  bag_id: string | null;
  is_checked: boolean;
  sort_order: number;
  tags: string[] | null;
  note: string | null;
};

type DbJourneyCategory = {
  journey_id: string;
  category_id: string;
  sort_order: number;
  collapse_checked: boolean;
};

type DbShare = {
  id: string;
  journey_id: string;
  share_token: string;
  permission: "read_only" | "editable";
  created_by: string;
};

type DbShareMember = {
  share_id: string;
  user_id: string;
};

function isDemoUserId(id: string): boolean {
  return id.startsWith("demo-");
}

/** 登入後以雲端旅程覆蓋正式帳資料；示範帳旅程留在本機且不匯入。 */
export async function pullCloudIntoState(state: AppState, userId: string): Promise<AppState> {
  if (!isSupabaseConfigured()) return state;
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();

  const { data: profile } = await supabase
    .from("users")
    .select("id, name, email, points, slot_capacity")
    .eq("id", userId)
    .maybeSingle();

  const { data: journeysData } = await supabase.from("journeys").select("*");
  const journeys = (journeysData as DbJourney[] | null) ?? [];
  const journeyIds = journeys.map((journey) => journey.id);

  const emptyBags: DbBag[] = [];
  const emptyItems: DbJourneyItem[] = [];
  const emptyCats: DbJourneyCategory[] = [];
  const emptyShares: DbShare[] = [];

  const [{ data: bagsData }, { data: itemsData }, { data: catsData }, { data: sharesData }] = await Promise.all([
    journeyIds.length ? supabase.from("bags").select("*").in("journey_id", journeyIds) : Promise.resolve({ data: emptyBags }),
    journeyIds.length
      ? supabase.from("journey_items").select("*").in("journey_id", journeyIds)
      : Promise.resolve({ data: emptyItems }),
    journeyIds.length
      ? supabase.from("journey_categories").select("*").in("journey_id", journeyIds)
      : Promise.resolve({ data: emptyCats }),
    journeyIds.length
      ? supabase.from("shares").select("*").in("journey_id", journeyIds)
      : Promise.resolve({ data: emptyShares }),
  ]);

  const shares = (sharesData as DbShare[] | null) ?? [];
  const shareIds = shares.map((share) => share.id);
  const { data: membersData } = shareIds.length
    ? await supabase.from("share_members").select("*").in("share_id", shareIds)
    : { data: [] as DbShareMember[] };

  const cloudJourneys: Journey[] = journeys.map((journey) => ({
    id: journey.id,
    ownerId: journey.user_id,
    name: journey.name,
    location: journey.location,
    days: journey.days,
    purpose: journey.purpose ?? "",
    startDate: journey.start_date,
    endDate: journey.end_date,
    mode: journey.mode,
    createdAt: journey.created_at,
    updatedAt: journey.updated_at,
  }));

  const demoJourneys = state.journeys.filter((journey) => isDemoUserId(journey.ownerId));
  const demoJourneyIds = new Set(demoJourneys.map((journey) => journey.id));

  const cloudUser: User = profile
    ? {
        id: profile.id as string,
        name: (profile.name as string) || "旅人",
        email: (profile.email as string) || "",
        points: Number(profile.points ?? 0),
        slotCapacity: Number(profile.slot_capacity ?? FREE_JOURNEY_LIMIT),
      }
    : state.users.find((user) => user.id === userId) ?? {
        id: userId,
        name: "旅人",
        email: "",
        points: 0,
        slotCapacity: FREE_JOURNEY_LIMIT,
      };

  const users = state.users.some((user) => user.id === userId)
    ? state.users.map((user) => (user.id === userId ? cloudUser : user))
    : [...state.users, cloudUser];

  const fallbackCategory = state.categories[0]?.id ?? "";

  return {
    ...state,
    users,
    sessionUserId: userId,
    journeys: [...demoJourneys, ...cloudJourneys],
    bags: [
      ...state.bags.filter((bag) => demoJourneyIds.has(bag.journeyId)),
      ...((bagsData as DbBag[] | null) ?? []).map(
        (bag): Bag => ({
          id: bag.id,
          journeyId: bag.journey_id,
          name: bag.name,
          type: bag.type,
          color: bag.color,
          sortOrder: bag.sort_order,
          sealed: bag.sealed,
        }),
      ),
    ],
    journeyItems: [
      ...state.journeyItems.filter((item) => demoJourneyIds.has(item.journeyId)),
      ...((itemsData as DbJourneyItem[] | null) ?? []).map(
        (item): JourneyItem => ({
          id: item.id,
          journeyId: item.journey_id,
          itemId: item.item_id,
          customName: item.custom_name,
          categoryId: item.category_id ?? fallbackCategory,
          bagId: item.bag_id ?? "",
          isChecked: item.is_checked,
          sortOrder: item.sort_order,
          tags: item.tags ?? [],
          note: item.note ?? "",
        }),
      ),
    ],
    journeyCategories: [
      ...state.journeyCategories.filter((row) => demoJourneyIds.has(row.journeyId)),
      ...((catsData as DbJourneyCategory[] | null) ?? []).map(
        (row): JourneyCategory => ({
          journeyId: row.journey_id,
          categoryId: row.category_id,
          sortOrder: row.sort_order,
          collapseChecked: row.collapse_checked,
        }),
      ),
    ],
    shares: [
      ...state.shares.filter((share) => demoJourneyIds.has(share.journeyId)),
      ...shares.map((share) => ({
        id: share.id,
        journeyId: share.journey_id,
        token: share.share_token,
        permission: share.permission,
        createdBy: share.created_by,
      })),
    ],
    shareMembers: ((membersData as DbShareMember[] | null) ?? []).map((member) => ({
      shareId: member.share_id,
      userId: member.user_id,
    })),
  };
}

/** 把本機新建的旅程送到雲端（create_journey RPC），回傳雲端 journey id。 */
export async function createJourneyOnCloud(
  state: AppState,
  journeyId: string,
): Promise<{ ok: true; cloudId: string } | { ok: false; reason: string }> {
  if (!isSupabaseConfigured()) return { ok: true, cloudId: journeyId };
  const journey = state.journeys.find((entry) => entry.id === journeyId);
  if (!journey) return { ok: false, reason: "找不到清單" };
  const bags = state.bags
    .filter((bag) => bag.journeyId === journeyId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const categories = state.journeyCategories
    .filter((row) => row.journeyId === journeyId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const items = state.journeyItems
    .filter((item) => item.journeyId === journeyId)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const bagKeyById = new Map(bags.map((bag, index) => [bag.id, `bag-${index}`]));

  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_journey", {
    p_name: journey.name,
    p_location: journey.location,
    p_days: journey.days,
    p_purpose: journey.purpose,
    p_start: journey.startDate,
    p_mode: journey.mode,
    p_bags: bags.map((bag, index) => ({
      key: `bag-${index}`,
      name: bag.name,
      type: bag.type,
      color: bag.color,
      sort_order: bag.sortOrder,
    })),
    p_categories: categories.map((row) => {
      const category = state.categories.find((entry) => entry.id === row.categoryId);
      return {
        id: row.categoryId,
        name: category?.name ?? "分類",
        is_system: category?.isSystem ?? true,
        sort_order: row.sortOrder,
        collapse_checked: row.collapseChecked,
      };
    }),
    p_items: items.map((item, index) => ({
      item_id: item.itemId,
      custom_name: item.customName,
      category_id: item.categoryId,
      bag_key: bagKeyById.get(item.bagId) ?? "bag-0",
      sort_order: index,
      tags: item.tags,
      note: item.note,
    })),
  });

  if (error) return { ok: false, reason: error.message };
  if (typeof data !== "string" || !data) return { ok: false, reason: "雲端沒有回傳旅程 id" };
  return { ok: true, cloudId: data };
}

export async function deleteJourneyOnCloud(journeyId: string): Promise<{ ok: boolean; reason?: string }> {
  if (!isSupabaseConfigured()) return { ok: true };
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { error } = await supabase.from("journeys").delete().eq("id", journeyId);
  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}

export async function pushJourneyBundle(
  state: AppState,
  journeyId: string,
): Promise<{ ok: boolean; reason?: string; conflict?: boolean; updatedAt?: string }> {
  if (!isSupabaseConfigured()) return { ok: true };
  const payload = journeyBundlePayload(state, journeyId);
  if (!payload) return { ok: false, reason: "找不到清單" };

  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { data, error } = await supabase.rpc("upsert_journey_bundle", {
    p_journey_id: journeyId,
    p_session_id: getSyncSessionId(),
    p_base_updated_at: payload.baseUpdatedAt,
    p_meta: payload.meta,
    p_bags: payload.bags,
    p_categories: payload.categories,
    p_items: payload.items,
  });

  if (error) return { ok: false, reason: error.message };
  const result = data as { ok?: boolean; conflict?: boolean; updated_at?: string };
  if (result?.conflict) return { ok: false, conflict: true, reason: "雲端有較新版本" };
  if (!result?.ok) return { ok: false, reason: "上傳失敗" };
  return { ok: true, updatedAt: result.updated_at };
}

export async function flushOutbox(getState: () => AppState): Promise<void> {
  if (!isSupabaseConfigured() || typeof navigator === "undefined" || !navigator.onLine) return;
  for (const entry of listOutbox()) {
    const result = await pushJourneyBundle(getState(), entry.journeyId);
    if (result.ok || result.conflict) removeOutboxJourney(entry.journeyId);
    else bumpOutboxTries(entry.journeyId);
  }
}

export async function grantPointsOnCloud(amount: number): Promise<{ ok: boolean; points?: number; reason?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, reason: "尚未設定雲端" };
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { data, error } = await supabase.rpc("grant_points", { p_amount: amount });
  if (error) return { ok: false, reason: error.message };
  return { ok: true, points: Number(data) };
}
