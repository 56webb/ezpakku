import { LOCK_TTL_MS } from "@/lib/constants";

export type EditLockRecord = {
  journeyId: string;
  holderUserId: string;
  holderSessionId: string;
  heartbeatAt: number;
};

export type AcquireLockResult =
  | { ok: true; held: true; tookOver?: boolean }
  | { ok: false; held: false; holderUserId?: string; reason: string };

export function isLockExpired(heartbeatAt: number, now = Date.now()): boolean {
  return heartbeatAt < now - LOCK_TTL_MS;
}

/** 純函式：本機／測試用的搶鎖邏輯（與雲端 RPC 語意對齊）。 */
export function acquireLockInMap(
  locks: Record<string, EditLockRecord>,
  input: { journeyId: string; userId: string; sessionId: string; now?: number },
): { locks: Record<string, EditLockRecord>; result: AcquireLockResult } {
  const now = input.now ?? Date.now();
  const existing = locks[input.journeyId];

  if (!existing || isLockExpired(existing.heartbeatAt, now)) {
    const next: EditLockRecord = {
      journeyId: input.journeyId,
      holderUserId: input.userId,
      holderSessionId: input.sessionId,
      heartbeatAt: now,
    };
    return {
      locks: { ...locks, [input.journeyId]: next },
      result: { ok: true, held: true, tookOver: Boolean(existing) },
    };
  }

  if (existing.holderUserId === input.userId && existing.holderSessionId === input.sessionId) {
    return {
      locks: {
        ...locks,
        [input.journeyId]: { ...existing, heartbeatAt: now },
      },
      result: { ok: true, held: true },
    };
  }

  return {
    locks,
    result: {
      ok: false,
      held: false,
      holderUserId: existing.holderUserId,
      reason: "其他人正在編輯這份清單",
    },
  };
}

export function renewLockInMap(
  locks: Record<string, EditLockRecord>,
  input: { journeyId: string; userId: string; sessionId: string; now?: number },
): { locks: Record<string, EditLockRecord>; result: AcquireLockResult } {
  const now = input.now ?? Date.now();
  const existing = locks[input.journeyId];
  if (
    !existing ||
    existing.holderUserId !== input.userId ||
    existing.holderSessionId !== input.sessionId
  ) {
    return { locks, result: { ok: false, held: false, reason: "沒有編輯鎖" } };
  }
  return {
    locks: { ...locks, [input.journeyId]: { ...existing, heartbeatAt: now } },
    result: { ok: true, held: true },
  };
}

export function releaseLockInMap(
  locks: Record<string, EditLockRecord>,
  input: { journeyId: string; userId: string; sessionId: string },
): Record<string, EditLockRecord> {
  const existing = locks[input.journeyId];
  if (
    !existing ||
    existing.holderUserId !== input.userId ||
    existing.holderSessionId !== input.sessionId
  ) {
    return locks;
  }
  const next = { ...locks };
  delete next[input.journeyId];
  return next;
}

export function holdsLock(
  locks: Record<string, EditLockRecord>,
  input: { journeyId: string; userId: string; sessionId: string; now?: number },
): boolean {
  const existing = locks[input.journeyId];
  if (!existing) return false;
  if (isLockExpired(existing.heartbeatAt, input.now ?? Date.now())) return false;
  return existing.holderUserId === input.userId && existing.holderSessionId === input.sessionId;
}
