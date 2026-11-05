"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { OAUTH_FLAG, POINTS_PER_SLOT } from "@/lib/constants";
import {
  addBag,
  addJourneyItem,
  adoptUser,
  buySlot,
  commitJourney,
  copyJourney,
  createInitialState,
  deleteJourney,
  grantPoints,
  moveJourneyItem,
  openShare,
  ownedJourneyCount,
  quoteCreate,
  removeJourneyItem,
  setBagSealed,
  setSharePermission,
  togglePacked,
  travelDays,
  updateJourneyMeta,
  visibleJourneys,
} from "@/lib/domain";
import {
  clearDraft,
  getAppServerSnapshot,
  getAppSnapshot,
  subscribeAppState,
  updateAppState,
} from "@/lib/browser-state";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { touchJourneyUpdatedAt } from "@/lib/sync/bundle";
import {
  createJourneyOnCloud,
  deleteJourneyOnCloud,
  flushOutbox,
  grantPointsOnCloud,
  pullCloudIntoState,
  pushJourneyBundle,
} from "@/lib/sync/cloud";
import { getLockSnapshot } from "@/lib/sync/lock-store";
import { enqueueJourneySync, listOutbox, removeOutboxJourney } from "@/lib/sync/outbox";
import { setSyncNotice } from "@/lib/sync/status";
import type { AppState, NewJourneyInput, Result, SharePermission, User } from "@/lib/types";

type StoreValue = {
  ready: boolean;
  state: AppState;
  user: User | null;
  travelDayCount: number;
  quote: ReturnType<typeof quoteCreate> | null;
  signInDemo: (userId: string) => void;
  signOut: () => void;
  grantDemoPoints: () => void;
  buySlot: () => ReturnType<typeof buySlot>;
  resetDemo: () => void;
  commit: (input: NewJourneyInput) => ReturnType<typeof commitJourney>;
  copy: (journeyId: string, startDate: string, token?: string) => ReturnType<typeof copyJourney>;
  remove: (journeyId: string) => ReturnType<typeof deleteJourney>;
  updateMeta: (
    journeyId: string,
    patch: Parameters<typeof updateJourneyMeta>[3],
  ) => ReturnType<typeof updateJourneyMeta>;
  createBag: (journeyId: string, bag: Parameters<typeof addBag>[3]) => ReturnType<typeof addBag>;
  sealBag: (bagId: string, sealed: boolean) => ReturnType<typeof setBagSealed>;
  addItem: (input: Parameters<typeof addJourneyItem>[2]) => ReturnType<typeof addJourneyItem>;
  moveItem: (journeyItemId: string, bagId: string) => ReturnType<typeof moveJourneyItem>;
  toggleItem: (journeyItemId: string) => ReturnType<typeof togglePacked>;
  removeItem: (journeyItemId: string) => ReturnType<typeof removeJourneyItem>;
  share: (journeyId: string, permission: SharePermission) => ReturnType<typeof setSharePermission>;
  acceptShare: (token: string) => ReturnType<typeof openShare>;
  journeys: ReturnType<typeof visibleJourneys>;
  syncNow: () => Promise<void>;
};

const StoreContext = createContext<StoreValue | null>(null);

async function bootstrapCloudUser(profile: { id: string; name: string; email: string }) {
  updateAppState((current) => adoptUser(current, profile));
  const afterAdopt = getAppSnapshot();
  if (!afterAdopt) return;
  try {
    const merged = await pullCloudIntoState(afterAdopt, profile.id);
    updateAppState(() => merged);
  } catch {
    // 本機快取仍可用
  }
  await flushOutbox(() => getAppSnapshot() ?? afterAdopt);
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(subscribeAppState, getAppSnapshot, getAppServerSnapshot);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;

    void (async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const fromOAuth = sessionStorage.getItem(OAUTH_FLAG) === "1";
      const { data } = await supabase.auth.getClaims();
      if (cancelled) return;
      const claims = data?.claims;
      const sub = typeof claims?.sub === "string" ? claims.sub : "";
      if (!sub) return;
      const email = typeof claims?.email === "string" ? claims.email : "";
      const metadata = claims?.user_metadata;
      const metadataName =
        metadata && typeof metadata === "object" && "full_name" in metadata
          ? String(metadata.full_name ?? "")
          : "";
      if (fromOAuth) sessionStorage.removeItem(OAUTH_FLAG);
      await bootstrapCloudUser({ id: sub, name: metadataName || email || "Google 使用者", email });
    })();

    const onOnline = () => {
      void flushOutbox(() => getAppSnapshot() ?? createInitialState());
    };
    window.addEventListener("online", onOnline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
    };
  }, []);

  const value = useMemo(() => (state ? createStoreValue(state) : null), [state]);

  if (!value) {
    return (
      <div className="phone-shell">
        <p className="p-4 text-sm">正在讀取這台裝置上的清單</p>
      </div>
    );
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("Store 尚未就緒");
  return value;
}

function guardEditLock(journeyId: string): string | null {
  const status = getLockSnapshot()[journeyId];
  if (status?.status === "blocked") return status.reason ?? "其他人正在編輯這份清單";
  if (status?.status === "acquiring") return "正在取得編輯權，請稍候";
  return null;
}

function scheduleJourneyPush(journeyId: string) {
  if (!isSupabaseConfigured()) return;
  enqueueJourneySync(journeyId);
  setSyncNotice({ kind: "syncing", message: "同步中…" });
  void (async () => {
    const current = getAppSnapshot();
    if (!current) return;
    const result = await pushJourneyBundle(current, journeyId);
    if (result.ok) {
      if (result.updatedAt) {
        updateAppState((state) => touchJourneyUpdatedAt(state, journeyId, result.updatedAt));
      }
      removeOutboxJourney(journeyId);
      const pending = listOutbox().length;
      setSyncNotice(
        pending
          ? { kind: "pending", message: `還有 ${pending} 筆待同步` }
          : { kind: "ok", message: "已同步到雲端" },
      );
      return;
    }
    if (result.conflict) {
      removeOutboxJourney(journeyId);
      setSyncNotice({ kind: "conflict", message: "雲端有較新版本，已改以雲端為準" });
      const latest = getAppSnapshot();
      const userId = latest?.sessionUserId;
      if (latest && userId) {
        const merged = await pullCloudIntoState(latest, userId);
        updateAppState(() => merged);
      }
      return;
    }
    setSyncNotice({ kind: "pending", message: result.reason ?? "稍後會再試著同步" });
  })();
}

async function uploadNewJourney(localId: string) {
  if (!isSupabaseConfigured()) return localId;
  setSyncNotice({ kind: "syncing", message: "上傳新清單…" });
  const current = getAppSnapshot();
  if (!current) return localId;
  const created = await createJourneyOnCloud(current, localId);
  if (!created.ok) {
    setSyncNotice({ kind: "error", message: created.reason });
    return localId;
  }
  const userId = current.sessionUserId;
  if (userId) {
    // 清掉本機這份，改拉雲端（id／包包 id 以雲為準）
    updateAppState((state) => ({
      ...state,
      journeys: state.journeys.filter((journey) => journey.id !== localId),
      bags: state.bags.filter((bag) => bag.journeyId !== localId),
      journeyItems: state.journeyItems.filter((item) => item.journeyId !== localId),
      journeyCategories: state.journeyCategories.filter((row) => row.journeyId !== localId),
    }));
    const after = getAppSnapshot() ?? current;
    const merged = await pullCloudIntoState(after, userId);
    updateAppState(() => merged);
  }
  setSyncNotice({ kind: "ok", message: "新清單已上雲" });
  return created.cloudId;
}

function createStoreValue(state: AppState): StoreValue {
  const user = state.users.find((entry) => entry.id === state.sessionUserId) ?? null;

  function apply<T extends Result<{ state: AppState }>>(
    userId: string | null,
    run: (current: AppState, userId: string) => T,
  ): T {
    let result = { ok: false, reason: "請先登入" } as T;
    if (!userId) return result;
    updateAppState((current) => {
      result = run(current, userId);
      return result.ok ? result.state : current;
    });
    return result;
  }

  function applyJourneyMutation<T extends Result<{ state: AppState }>>(
    userId: string | null,
    journeyId: string,
    run: (current: AppState, userId: string) => T,
  ): T {
    const blocked = guardEditLock(journeyId);
    if (blocked) return { ok: false, reason: blocked } as T;
    const result = apply(userId, (current, id) => {
      const next = run(current, id);
      if (!next.ok) return next;
      return { ...next, state: touchJourneyUpdatedAt(next.state, journeyId) };
    });
    if (result.ok) scheduleJourneyPush(journeyId);
    return result;
  }

  return {
    ready: true,
    state,
    user,
    travelDayCount: user ? travelDays(state, user.id) : 0,
    quote: user ? quoteCreate(user, ownedJourneyCount(state, user.id)) : null,
    journeys: user ? visibleJourneys(state, user.id) : [],
    syncNow: async () => {
      if (!user || !isSupabaseConfigured()) return;
      const current = getAppSnapshot();
      if (!current) return;
      const merged = await pullCloudIntoState(current, user.id);
      updateAppState(() => merged);
      await flushOutbox(() => getAppSnapshot() ?? merged);
    },
    signInDemo: (userId) => {
      updateAppState((current) => ({ ...current, sessionUserId: userId }));
    },
    signOut: () => {
      updateAppState((current) => ({ ...current, sessionUserId: null }));
      if (isSupabaseConfigured()) {
        void import("@/lib/supabase/client").then(({ createClient }) => createClient().auth.signOut());
      }
    },
    grantDemoPoints: () => {
      if (!user) return;
      if (isSupabaseConfigured() && !user.id.startsWith("demo-")) {
        void grantPointsOnCloud(POINTS_PER_SLOT).then(async (result) => {
          if (!result.ok) {
            const message =
              result.reason?.includes("already claimed") || result.reason?.includes("demo points")
                ? "示範點已領過，每位帳號限一次"
                : (result.reason ?? "加點失敗");
            setSyncNotice({ kind: "error", message });
            return;
          }
          const current = getAppSnapshot();
          if (!current) return;
          const merged = await pullCloudIntoState(current, user.id);
          updateAppState(() => merged);
          setSyncNotice({ kind: "ok", message: `已加 ${POINTS_PER_SLOT} 點（示範限領一次）` });
        });
        return;
      }
      const result = grantPoints(getAppSnapshot() ?? createInitialState(), user.id, POINTS_PER_SLOT);
      if (!result.ok) {
        setSyncNotice({ kind: "error", message: result.reason });
        return;
      }
      updateAppState(() => result.state);
    },
    buySlot: () => {
      const result = apply(user?.id ?? null, (current, userId) => buySlot(current, userId));
      if (result.ok && user && isSupabaseConfigured() && !user.id.startsWith("demo-")) {
        void (async () => {
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          const { error } = await supabase.rpc("buy_slot");
          if (error) {
            setSyncNotice({ kind: "error", message: error.message });
            return;
          }
          const current = getAppSnapshot();
          if (!current) return;
          const merged = await pullCloudIntoState(current, user.id);
          updateAppState(() => merged);
        })();
      }
      return result;
    },
    resetDemo: () => {
      clearDraft();
      updateAppState(() => createInitialState());
    },
    commit: (input) => {
      const result = apply(user?.id ?? null, (current, userId) => commitJourney(current, userId, input));
      if (result.ok) void uploadNewJourney(result.id);
      return result;
    },
    copy: (journeyId, startDate, token) => {
      const result = apply(user?.id ?? null, (current, userId) =>
        copyJourney(current, userId, journeyId, startDate, token),
      );
      if (result.ok) void uploadNewJourney(result.id);
      return result;
    },
    remove: (journeyId) => {
      const result = apply(user?.id ?? null, (current, userId) => deleteJourney(current, userId, journeyId));
      if (result.ok && isSupabaseConfigured() && !journeyId.startsWith("demo-")) {
        void deleteJourneyOnCloud(journeyId).then((deleted) => {
          if (!deleted.ok) setSyncNotice({ kind: "error", message: deleted.reason ?? "雲端刪除失敗" });
        });
      }
      return result;
    },
    updateMeta: (journeyId, patch) =>
      applyJourneyMutation(user?.id ?? null, journeyId, (current, userId) =>
        updateJourneyMeta(current, userId, journeyId, patch),
      ),
    createBag: (journeyId, bag) =>
      applyJourneyMutation(user?.id ?? null, journeyId, (current, userId) =>
        addBag(current, userId, journeyId, bag),
      ),
    sealBag: (bagId, sealed) => {
      const bag = state.bags.find((entry) => entry.id === bagId);
      if (!bag) return { ok: false, reason: "找不到包包" };
      return applyJourneyMutation(user?.id ?? null, bag.journeyId, (current, userId) =>
        setBagSealed(current, userId, bagId, sealed),
      );
    },
    addItem: (input) =>
      applyJourneyMutation(user?.id ?? null, input.journeyId, (current, userId) =>
        addJourneyItem(current, userId, input),
      ),
    moveItem: (journeyItemId, bagId) => {
      const item = state.journeyItems.find((entry) => entry.id === journeyItemId);
      if (!item) return { ok: false, reason: "找不到物品" };
      return applyJourneyMutation(user?.id ?? null, item.journeyId, (current, userId) =>
        moveJourneyItem(current, userId, journeyItemId, bagId),
      );
    },
    toggleItem: (journeyItemId) => {
      const item = state.journeyItems.find((entry) => entry.id === journeyItemId);
      if (!item) return { ok: false, reason: "找不到物品" };
      return applyJourneyMutation(user?.id ?? null, item.journeyId, (current, userId) =>
        togglePacked(current, userId, journeyItemId),
      );
    },
    removeItem: (journeyItemId) => {
      const item = state.journeyItems.find((entry) => entry.id === journeyItemId);
      if (!item) return { ok: false, reason: "找不到物品" };
      return applyJourneyMutation(user?.id ?? null, item.journeyId, (current, userId) =>
        removeJourneyItem(current, userId, journeyItemId),
      );
    },
    share: (journeyId, permission) =>
      apply(user?.id ?? null, (current, userId) => setSharePermission(current, userId, journeyId, permission)),
    acceptShare: (token) => apply(user?.id ?? null, (current, userId) => openShare(current, userId, token)),
  };
}
