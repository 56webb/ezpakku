import { describe, expect, it } from "vitest";
import { LOCK_TTL_MS } from "@/lib/constants";
import { acquireLockInMap, holdsLock, releaseLockInMap, renewLockInMap } from "@/lib/sync/lock-logic";

describe("編輯鎖（趕走後者）", () => {
  it("先到的取得鎖，後到的失敗", () => {
    const now = 1_000_000;
    const first = acquireLockInMap(
      {},
      { journeyId: "j1", userId: "a", sessionId: "s1", now },
    );
    expect(first.result.ok).toBe(true);

    const second = acquireLockInMap(first.locks, {
      journeyId: "j1",
      userId: "b",
      sessionId: "s2",
      now: now + 1_000,
    });
    expect(second.result.ok).toBe(false);
    if (!second.result.ok) {
      expect(second.result.reason).toMatch(/其他人/);
      expect(second.result.holderUserId).toBe("a");
    }
  });

  it("同 user 不同 session 也算後者", () => {
    const now = 1_000_000;
    const first = acquireLockInMap({}, { journeyId: "j1", userId: "a", sessionId: "tab-1", now });
    const second = acquireLockInMap(first.locks, {
      journeyId: "j1",
      userId: "a",
      sessionId: "tab-2",
      now: now + 500,
    });
    expect(second.result.ok).toBe(false);
  });

  it("心跳過期後可被接手", () => {
    const now = 1_000_000;
    const first = acquireLockInMap({}, { journeyId: "j1", userId: "a", sessionId: "s1", now });
    const takeover = acquireLockInMap(first.locks, {
      journeyId: "j1",
      userId: "b",
      sessionId: "s2",
      now: now + LOCK_TTL_MS + 1,
    });
    expect(takeover.result.ok).toBe(true);
    if (takeover.result.ok) expect(takeover.result.tookOver).toBe(true);
    expect(holdsLock(takeover.locks, { journeyId: "j1", userId: "b", sessionId: "s2", now: now + LOCK_TTL_MS + 1 })).toBe(
      true,
    );
  });

  it("持有者可續命與釋放", () => {
    const now = 1_000_000;
    const first = acquireLockInMap({}, { journeyId: "j1", userId: "a", sessionId: "s1", now });
    const renewed = renewLockInMap(first.locks, {
      journeyId: "j1",
      userId: "a",
      sessionId: "s1",
      now: now + 20_000,
    });
    expect(renewed.result.ok).toBe(true);
    const released = releaseLockInMap(renewed.locks, { journeyId: "j1", userId: "a", sessionId: "s1" });
    expect(holdsLock(released, { journeyId: "j1", userId: "a", sessionId: "s1", now: now + 20_000 })).toBe(false);

    const again = acquireLockInMap(released, {
      journeyId: "j1",
      userId: "b",
      sessionId: "s2",
      now: now + 21_000,
    });
    expect(again.result.ok).toBe(true);
  });
});
