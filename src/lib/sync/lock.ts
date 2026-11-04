import { EDIT_LOCKS_KEY } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  acquireLockInMap,
  holdsLock,
  releaseLockInMap,
  renewLockInMap,
  type AcquireLockResult,
  type EditLockRecord,
} from "@/lib/sync/lock-logic";
import { getSyncSessionId } from "@/lib/sync/session";

function readLocalLocks(): Record<string, EditLockRecord> {
  try {
    const raw = localStorage.getItem(EDIT_LOCKS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, EditLockRecord>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalLocks(locks: Record<string, EditLockRecord>): void {
  localStorage.setItem(EDIT_LOCKS_KEY, JSON.stringify(locks));
}

export async function acquireEditLock(journeyId: string, userId: string): Promise<AcquireLockResult> {
  const sessionId = getSyncSessionId();

  if (isSupabaseConfigured()) {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data, error } = await supabase.rpc("acquire_edit_lock", {
        p_journey_id: journeyId,
        p_session_id: sessionId,
      });
      if (error) return { ok: false, held: false, reason: error.message };
      const payload = data as AcquireLockResult & { holder_user_id?: string };
      if (payload.ok) return { ok: true, held: true, tookOver: Boolean((payload as { took_over?: boolean }).took_over) };
      return {
        ok: false,
        held: false,
        holderUserId: payload.holder_user_id,
        reason: (payload as { reason?: string }).reason ?? "其他人正在編輯這份清單",
      };
    } catch (caught) {
      return { ok: false, held: false, reason: caught instanceof Error ? caught.message : "搶鎖失敗" };
    }
  }

  const { locks, result } = acquireLockInMap(readLocalLocks(), { journeyId, userId, sessionId });
  writeLocalLocks(locks);
  return result;
}

export async function renewEditLock(journeyId: string, userId: string): Promise<AcquireLockResult> {
  const sessionId = getSyncSessionId();

  if (isSupabaseConfigured()) {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data, error } = await supabase.rpc("renew_edit_lock", {
        p_journey_id: journeyId,
        p_session_id: sessionId,
      });
      if (error) return { ok: false, held: false, reason: error.message };
      const payload = data as AcquireLockResult;
      if (payload.ok) return { ok: true, held: true };
      return { ok: false, held: false, reason: (payload as { reason?: string }).reason ?? "沒有編輯鎖" };
    } catch (caught) {
      return { ok: false, held: false, reason: caught instanceof Error ? caught.message : "續鎖失敗" };
    }
  }

  const { locks, result } = renewLockInMap(readLocalLocks(), { journeyId, userId, sessionId });
  writeLocalLocks(locks);
  return result;
}

export async function releaseEditLock(journeyId: string, userId: string): Promise<void> {
  const sessionId = getSyncSessionId();

  if (isSupabaseConfigured()) {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await supabase.rpc("release_edit_lock", {
        p_journey_id: journeyId,
        p_session_id: sessionId,
      });
    } catch {
      // ignore
    }
    return;
  }

  writeLocalLocks(releaseLockInMap(readLocalLocks(), { journeyId, userId, sessionId }));
}

export function locallyHoldsEditLock(journeyId: string, userId: string): boolean {
  return holdsLock(readLocalLocks(), { journeyId, userId, sessionId: getSyncSessionId() });
}
