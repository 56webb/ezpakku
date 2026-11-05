import { describe, expect, it } from "vitest";
import { FREE_JOURNEY_LIMIT, POINTS_PER_SLOT } from "@/lib/constants";
import { categoryIds } from "@/lib/seed";
import {
  buySlot,
  commitJourney,
  createInitialState,
  deleteJourney,
  grantPoints,
  ownedJourneyCount,
  quoteCreate,
  travelDays,
  updateJourneyMeta,
} from "@/lib/domain";
import type { AppState, NewJourneyInput, User } from "@/lib/types";

const userA = "demo-traveler-a";

function baseInput(overrides: Partial<NewJourneyInput> = {}): NewJourneyInput {
  return {
    mode: "detail",
    location: "東京",
    days: 3,
    purpose: "旅遊",
    name: "東京三日",
    startDate: "2026-12-01",
    bags: [{ name: "隨身包包", type: "backpack", color: "#2471a3" }],
    categories: [
      {
        id: categoryIds.misc,
        name: "其他",
        isSystem: true,
        sortOrder: 0,
        collapseChecked: false,
      },
    ],
    items: [
      {
        itemId: null,
        customName: "充電器",
        categoryId: categoryIds.misc,
        bagIndex: 0,
      },
    ],
    ...overrides,
  };
}

function withPoints(state: AppState, points: number): AppState {
  return {
    ...state,
    users: state.users.map((user) => (user.id === userA ? { ...user, points } : user)),
  };
}

function userOf(state: AppState): User {
  const user = state.users.find((entry) => entry.id === userA);
  if (!user) throw new Error("missing demo user");
  return user;
}

describe("欄位與點數", () => {
  it("一開始有兩個免費欄位，建滿前不扣點", () => {
    let state = createInitialState();
    expect(userOf(state).slotCapacity).toBe(FREE_JOURNEY_LIMIT);
    expect(quoteCreate(userOf(state), 0).allowed).toBe(true);

    for (let index = 0; index < FREE_JOURNEY_LIMIT; index += 1) {
      const created = commitJourney(state, userA, baseInput({ name: `清單 ${index}` }));
      expect(created.ok).toBe(true);
      if (!created.ok) return;
      state = created.state;
    }

    expect(ownedJourneyCount(state, userA)).toBe(FREE_JOURNEY_LIMIT);
    expect(quoteCreate(userOf(state), ownedJourneyCount(state, userA)).allowed).toBe(false);
    expect(userOf(state).points).toBe(0);
  });

  it("100 點永久加一格，點數與欄位同一狀態更新", () => {
    let state = withPoints(createInitialState(), POINTS_PER_SLOT);
    const bought = buySlot(state, userA);
    expect(bought.ok).toBe(true);
    if (!bought.ok) return;
    state = bought.state;
    expect(userOf(state).points).toBe(0);
    expect(userOf(state).slotCapacity).toBe(FREE_JOURNEY_LIMIT + 1);
  });

  it("刪除釋出欄位但不退點、也不減少容量", () => {
    let state = withPoints(createInitialState(), POINTS_PER_SLOT);
    const bought = buySlot(state, userA);
    expect(bought.ok).toBe(true);
    if (!bought.ok) return;
    state = bought.state;

    for (let index = 0; index < FREE_JOURNEY_LIMIT + 1; index += 1) {
      const created = commitJourney(state, userA, baseInput({ name: `滿欄 ${index}` }));
      expect(created.ok).toBe(true);
      if (!created.ok) return;
      state = created.state;
    }

    const victim = state.journeys.find((journey) => journey.ownerId === userA);
    expect(victim).toBeTruthy();
    const removed = deleteJourney(state, userA, victim!.id);
    expect(removed.ok).toBe(true);
    if (!removed.ok) return;
    state = removed.state;

    expect(userOf(state).points).toBe(0);
    expect(userOf(state).slotCapacity).toBe(FREE_JOURNEY_LIMIT + 1);
    expect(ownedJourneyCount(state, userA)).toBe(FREE_JOURNEY_LIMIT);
    expect(quoteCreate(userOf(state), ownedJourneyCount(state, userA)).allowed).toBe(true);
  });

  it("點數不足不能加欄位", () => {
    const granted = grantPoints(createInitialState(), userA, POINTS_PER_SLOT - 1);
    expect(granted.ok).toBe(true);
    if (!granted.ok) return;
    const bought = buySlot(granted.state, userA);
    expect(bought.ok).toBe(false);
  });

  it("示範點每位帳號只能領一次", () => {
    const first = grantPoints(createInitialState(), userA, POINTS_PER_SLOT);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(userOf(first.state).points).toBe(POINTS_PER_SLOT);
    const second = grantPoints(first.state, userA, POINTS_PER_SLOT);
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.reason).toMatch(/限一次|已領過/);
  });
});

describe("累計旅行天數", () => {
  it("是目前擁有清單天數加總；改天數跟著改；刪掉就離開加總", () => {
    let state = createInitialState();
    const first = commitJourney(state, userA, baseInput({ days: 3, name: "三日" }));
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    state = first.state;
    expect(travelDays(state, userA)).toBe(3);

    const second = commitJourney(state, userA, baseInput({ days: 5, name: "五日", startDate: "2026-12-10" }));
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    state = second.state;
    expect(travelDays(state, userA)).toBe(8);

    const patched = updateJourneyMeta(state, userA, first.id, { days: 4 });
    expect(patched.ok).toBe(true);
    if (!patched.ok) return;
    state = patched.state;
    expect(travelDays(state, userA)).toBe(9);

    const removed = deleteJourney(state, userA, second.id);
    expect(removed.ok).toBe(true);
    if (!removed.ok) return;
    state = removed.state;
    expect(travelDays(state, userA)).toBe(4);
  });
});

describe("建立旅程", () => {
  it("必須有正確出發日", () => {
    const state = createInitialState();
    const bad = commitJourney(state, userA, baseInput({ startDate: "明天" }));
    expect(bad.ok).toBe(false);
    if (bad.ok) return;
    expect(bad.reason).toMatch(/出發日/);

    const good = commitJourney(state, userA, baseInput({ startDate: "2026-11-20" }));
    expect(good.ok).toBe(true);
  });

  it("建立只佔空欄位，不扣點", () => {
    let state = withPoints(createInitialState(), 50);
    const created = commitJourney(state, userA, baseInput());
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    state = created.state;
    expect(userOf(state).points).toBe(50);
  });
});
