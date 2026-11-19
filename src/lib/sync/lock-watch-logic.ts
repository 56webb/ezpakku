import type { EditLockRecord } from "@/lib/sync/lock-logic";
import { holdsLock, isLockExpired } from "@/lib/sync/lock-logic";

export type LockWatchEvent =
  | { kind: "foreign_hold"; holderUserId?: string }
  | { kind: "self_hold" }
  | { kind: "cleared" }
  | { kind: "ignore" };

type LockRow = {
  holder_user_id?: string;
  holder_session_id?: string;
  holderUserId?: string;
  holderSessionId?: string;
};

function rowHolder(row: LockRow): { userId?: string; sessionId?: string } {
  return {
    userId: row.holder_user_id ?? row.holderUserId,
    sessionId: row.holder_session_id ?? row.holderSessionId,
  };
}

/** 解讀雲端 Realtime postgres_changes，決定要踢自己還是重搶鎖。 */
export function interpretLockChange(input: {
  eventType: "INSERT" | "UPDATE" | "DELETE" | string;
  row: LockRow | null;
  userId: string;
  sessionId: string;
}): LockWatchEvent {
  if (input.eventType === "DELETE" || !input.row) {
    return { kind: "cleared" };
  }
  const holder = rowHolder(input.row);
  if (!holder.userId || !holder.sessionId) return { kind: "ignore" };
  if (holder.userId === input.userId && holder.sessionId === input.sessionId) {
    return { kind: "self_hold" };
  }
  return { kind: "foreign_hold", holderUserId: holder.userId };
}

/** 解讀本機 localStorage 鎖表（跨分頁）。 */
export function interpretLocalLockMap(input: {
  locks: Record<string, EditLockRecord>;
  journeyId: string;
  userId: string;
  sessionId: string;
  now?: number;
}): LockWatchEvent {
  const now = input.now ?? Date.now();
  const existing = input.locks[input.journeyId];
  if (!existing || isLockExpired(existing.heartbeatAt, now)) {
    return { kind: "cleared" };
  }
  if (holdsLock(input.locks, { journeyId: input.journeyId, userId: input.userId, sessionId: input.sessionId, now })) {
    return { kind: "self_hold" };
  }
  return { kind: "foreign_hold", holderUserId: existing.holderUserId };
}
