"use client";

import { useEffect } from "react";
import { LOCK_HEARTBEAT_MS } from "@/lib/constants";
import { acquireEditLock, releaseEditLock, renewEditLock } from "@/lib/sync/lock";
import { clearJourneyLockStatus, setJourneyLockStatus, useJourneyLock } from "@/lib/sync/lock-store";

/** 進清單頁搶編輯鎖；後到的變成 blocked。 */
export function useEditLock(journeyId: string, userId: string | null, enabled: boolean) {
  const lock = useJourneyLock(journeyId);

  useEffect(() => {
    if (!enabled || !userId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    setJourneyLockStatus(journeyId, "acquiring");
    void (async () => {
      const result = await acquireEditLock(journeyId, userId);
      if (cancelled) {
        if (result.ok) await releaseEditLock(journeyId, userId);
        return;
      }
      if (result.ok) {
        setJourneyLockStatus(journeyId, "held");
        timer = setInterval(() => {
          void renewEditLock(journeyId, userId).then((renewed) => {
            if (!renewed.ok) setJourneyLockStatus(journeyId, "blocked", renewed.reason);
          });
        }, LOCK_HEARTBEAT_MS);
      } else {
        setJourneyLockStatus(journeyId, "blocked", result.reason);
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      void releaseEditLock(journeyId, userId);
      clearJourneyLockStatus(journeyId);
    };
  }, [enabled, journeyId, userId]);

  return lock;
}
