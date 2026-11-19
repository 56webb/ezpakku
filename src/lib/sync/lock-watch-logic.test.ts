import { describe, expect, it } from "vitest";
import { interpretLocalLockMap, interpretLockChange } from "@/lib/sync/lock-watch-logic";
import type { EditLockRecord } from "@/lib/sync/lock-logic";

describe("lock realtime 解讀", () => {
  it("DELETE 視為鎖已釋放", () => {
    expect(
      interpretLockChange({
        eventType: "DELETE",
        row: null,
        userId: "a",
        sessionId: "s1",
      }),
    ).toEqual({ kind: "cleared" });
  });

  it("自己的 INSERT／UPDATE 視為仍持鎖", () => {
    expect(
      interpretLockChange({
        eventType: "UPDATE",
        row: { holder_user_id: "a", holder_session_id: "s1" },
        userId: "a",
        sessionId: "s1",
      }),
    ).toEqual({ kind: "self_hold" });
  });

  it("別人持鎖要踢掉自己", () => {
    expect(
      interpretLockChange({
        eventType: "INSERT",
        row: { holder_user_id: "b", holder_session_id: "s2" },
        userId: "a",
        sessionId: "s1",
      }),
    ).toEqual({ kind: "foreign_hold", holderUserId: "b" });
  });

  it("本機鎖表：別人持有 → foreign_hold；過期或沒有 → cleared", () => {
    const now = 1_000_000;
    const locks: Record<string, EditLockRecord> = {
      j1: {
        journeyId: "j1",
        holderUserId: "b",
        holderSessionId: "s2",
        heartbeatAt: now,
      },
    };
    expect(
      interpretLocalLockMap({ locks, journeyId: "j1", userId: "a", sessionId: "s1", now }),
    ).toEqual({ kind: "foreign_hold", holderUserId: "b" });
    expect(
      interpretLocalLockMap({ locks: {}, journeyId: "j1", userId: "a", sessionId: "s1", now }),
    ).toEqual({ kind: "cleared" });
  });
});
