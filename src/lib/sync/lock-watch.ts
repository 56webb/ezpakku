import { EDIT_LOCKS_KEY } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  interpretLocalLockMap,
  interpretLockChange,
  type LockWatchEvent,
} from "@/lib/sync/lock-watch-logic";
import type { EditLockRecord } from "@/lib/sync/lock-logic";
import { getSyncSessionId } from "@/lib/sync/session";

export type WatchEditLockHandlers = {
  onEvent: (event: LockWatchEvent) => void;
};

function parseLocalLocks(raw: string | null): Record<string, EditLockRecord> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, EditLockRecord>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** 監聽編輯鎖變化：雲端走 Realtime；本機示範走 storage 跨分頁。 */
export function watchEditLock(
  journeyId: string,
  userId: string,
  handlers: WatchEditLockHandlers,
): () => void {
  const sessionId = getSyncSessionId();
  const cleanups: Array<() => void> = [];

  if (isSupabaseConfigured()) {
    let cancelled = false;
    void (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const channel = supabase
          .channel(`journey-edit-lock:${journeyId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "journey_edit_locks",
              filter: `journey_id=eq.${journeyId}`,
            },
            (payload) => {
              const row =
                (payload.new as Record<string, string> | null) ??
                (payload.old as Record<string, string> | null) ??
                null;
              const event = interpretLockChange({
                eventType: payload.eventType,
                row,
                userId,
                sessionId,
              });
              if (event.kind !== "ignore" && event.kind !== "self_hold") {
                handlers.onEvent(event);
              }
            },
          )
          .subscribe();

        cleanups.push(() => {
          cancelled = true;
          void supabase.removeChannel(channel);
        });
        if (cancelled) {
          void supabase.removeChannel(channel);
        }
      } catch {
        // Realtime 失敗時仍靠心跳輪詢
      }
    })();
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key !== EDIT_LOCKS_KEY) return;
    const locks = parseLocalLocks(event.newValue);
    const interpreted = interpretLocalLockMap({ locks, journeyId, userId, sessionId });
    if (interpreted.kind === "ignore" || interpreted.kind === "self_hold") return;
    handlers.onEvent(interpreted);
  };
  window.addEventListener("storage", onStorage);
  cleanups.push(() => window.removeEventListener("storage", onStorage));

  return () => {
    for (const cleanup of cleanups.splice(0)) cleanup();
  };
}
