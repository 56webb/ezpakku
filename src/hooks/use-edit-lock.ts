"use client";

import { useEffect } from "react";
import { LOCK_HEARTBEAT_MS } from "@/lib/constants";
import { zhTW } from "@/i18n/zh-TW";
import { acquireEditLock, releaseEditLock, renewEditLock } from "@/lib/sync/lock";
import {
  clearJourneyLockStatus,
  getLockSnapshot,
  setJourneyLockStatus,
  useJourneyLock,
} from "@/lib/sync/lock-store";
import { watchEditLock } from "@/lib/sync/lock-watch";

/** 進清單頁搶編輯鎖；後到的變成 blocked。Realtime／跨分頁會立刻踢人或重搶。 */
export function useEditLock(journeyId: string, userId: string | null, enabled: boolean) {
  const lock = useJourneyLock(journeyId);

  useEffect(() => {
    if (!enabled || !userId) return;
    const uid = userId;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    let acquiring = false;

    function stopHeartbeat() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    function startHeartbeat() {
      stopHeartbeat();
      timer = setInterval(() => {
        void renewEditLock(journeyId, uid).then((renewed) => {
          if (cancelled) return;
          if (!renewed.ok) {
            stopHeartbeat();
            setJourneyLockStatus(journeyId, "blocked", renewed.reason ?? zhTW.othersEditing);
          }
        });
      }, LOCK_HEARTBEAT_MS);
    }

    async function tryAcquire() {
      if (cancelled || acquiring) return;
      acquiring = true;
      setJourneyLockStatus(journeyId, "acquiring");
      try {
        const result = await acquireEditLock(journeyId, uid);
        if (cancelled) {
          if (result.ok) await releaseEditLock(journeyId, uid);
          return;
        }
        if (result.ok) {
          setJourneyLockStatus(journeyId, "held");
          startHeartbeat();
        } else {
          stopHeartbeat();
          setJourneyLockStatus(journeyId, "blocked", result.reason ?? zhTW.othersEditing);
        }
      } finally {
        acquiring = false;
      }
    }

    void tryAcquire();

    const unwatch = watchEditLock(journeyId, uid, {
      onEvent: (event) => {
        if (cancelled) return;
        if (event.kind === "foreign_hold") {
          stopHeartbeat();
          setJourneyLockStatus(journeyId, "blocked", zhTW.othersEditing);
          return;
        }
        if (event.kind === "cleared") {
          const current = getLockSnapshot()[journeyId];
          if (current?.status === "blocked") {
            void tryAcquire();
          }
        }
      },
    });

    return () => {
      cancelled = true;
      stopHeartbeat();
      unwatch();
      void releaseEditLock(journeyId, uid);
      clearJourneyLockStatus(journeyId);
    };
  }, [enabled, journeyId, userId]);

  return lock;
}
