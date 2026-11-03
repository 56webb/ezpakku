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
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(subscribeAppState, getAppSnapshot, getAppServerSnapshot);

  useEffect(() => {
    if (!isSupabaseConfigured() || sessionStorage.getItem(OAUTH_FLAG) !== "1") return;
    let cancelled = false;
    void (async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
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
      sessionStorage.removeItem(OAUTH_FLAG);
      updateAppState((current) =>
        adoptUser(current, { id: sub, name: metadataName || email || "Google 使用者", email }),
      );
    })();
    return () => {
      cancelled = true;
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

  return {
    ready: true,
    state,
    user,
    travelDayCount: user ? travelDays(state, user.id) : 0,
    quote: user ? quoteCreate(user, ownedJourneyCount(state, user.id)) : null,
    journeys: user ? visibleJourneys(state, user.id) : [],
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
      updateAppState((current) => grantPoints(current, user.id, POINTS_PER_SLOT));
    },
    buySlot: () => apply(user?.id ?? null, (current, userId) => buySlot(current, userId)),
    resetDemo: () => {
      clearDraft();
      updateAppState(() => createInitialState());
    },
    commit: (input) => apply(user?.id ?? null, (current, userId) => commitJourney(current, userId, input)),
    copy: (journeyId, startDate, token) =>
      apply(user?.id ?? null, (current, userId) => copyJourney(current, userId, journeyId, startDate, token)),
    remove: (journeyId) => apply(user?.id ?? null, (current, userId) => deleteJourney(current, userId, journeyId)),
    updateMeta: (journeyId, patch) =>
      apply(user?.id ?? null, (current, userId) => updateJourneyMeta(current, userId, journeyId, patch)),
    createBag: (journeyId, bag) =>
      apply(user?.id ?? null, (current, userId) => addBag(current, userId, journeyId, bag)),
    sealBag: (bagId, sealed) =>
      apply(user?.id ?? null, (current, userId) => setBagSealed(current, userId, bagId, sealed)),
    addItem: (input) => apply(user?.id ?? null, (current, userId) => addJourneyItem(current, userId, input)),
    moveItem: (journeyItemId, bagId) =>
      apply(user?.id ?? null, (current, userId) => moveJourneyItem(current, userId, journeyItemId, bagId)),
    toggleItem: (journeyItemId) =>
      apply(user?.id ?? null, (current, userId) => togglePacked(current, userId, journeyItemId)),
    removeItem: (journeyItemId) =>
      apply(user?.id ?? null, (current, userId) => removeJourneyItem(current, userId, journeyItemId)),
    share: (journeyId, permission) =>
      apply(user?.id ?? null, (current, userId) => setSharePermission(current, userId, journeyId, permission)),
    acceptShare: (token) => apply(user?.id ?? null, (current, userId) => openShare(current, userId, token)),
  };
}
