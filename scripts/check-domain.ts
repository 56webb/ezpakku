import { itemIds } from "../src/lib/seed";
import {
  buySlot,
  commitJourney,
  copyJourney,
  createInitialState,
  deleteJourney,
  grantPoints,
  hydrateState,
  openShare,
  ownedJourneyCount,
  quoteCreate,
  setSharePermission,
  travelDays,
  updateJourneyMeta,
} from "../src/lib/domain";
import type { NewJourneyInput } from "../src/lib/types";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const input = (name: string, days = 5): NewJourneyInput => ({
  mode: "detail",
  location: "京都",
  days,
  purpose: "",
  name,
  startDate: "2026-11-01",
  bags: [{ name: "行李箱", type: "suitcase", color: "#111111" }],
  categories: [],
  items: [
    {
      itemId: itemIds.passport,
      customName: null,
      categoryId: "10000000-0000-4000-8000-000000000004",
      bagIndex: 0,
    },
  ],
});

let state = createInitialState();
const userA = "demo-traveler-a";
const userB = "demo-traveler-b";
const account = () => state.users.find((user) => user.id === userA);

const first = commitJourney(state, userA, input("第一份"));
assert(first.ok, "first journey");
if (!first.ok) throw new Error("narrow");
state = first.state;
assert(account()?.slotCapacity === 2, "capacity starts at 2");
assert(account()?.points === 0, "points stay 0");
assert(travelDays(state, userA) === 5, "travel days 5");

const second = commitJourney(state, userA, input("第二份"));
assert(second.ok, "second journey");
if (!second.ok) throw new Error("narrow");
state = second.state;
assert(travelDays(state, userA) === 10, "travel days 10");

const blocked = commitJourney(state, userA, input("第三份"));
assert(!blocked.ok, "third blocked while capacity is full");
assert(account()?.points === 0, "failed create does not charge");

state = grantPoints(state, userA, 100);
const stillBlocked = commitJourney(state, userA, input("第三份"));
assert(!stillBlocked.ok, "points do not create a journey by themselves");
assert(account()?.points === 100, "unused points stay");

const bought = buySlot(state, userA);
assert(bought.ok, "buy slot");
if (!bought.ok) throw new Error("narrow");
state = bought.state;
assert(account()?.slotCapacity === 3, "slot is permanent");
assert(account()?.points === 0, "100 points spent on the slot");

const third = commitJourney(state, userA, input("第三份"));
assert(third.ok, "third uses the new slot");
if (!third.ok) throw new Error("narrow");
state = third.state;
assert(account()?.points === 0, "creating does not spend points");
assert(travelDays(state, userA) === 15, "travel days 15");

const edited = updateJourneyMeta(state, userA, first.id, { days: 9 });
assert(edited.ok, "days can change");
if (!edited.ok) throw new Error("narrow");
state = edited.state;
const editedJourney = state.journeys.find((journey) => journey.id === first.id);
assert(editedJourney?.days === 9, "days become 9");
assert(travelDays(state, userA) === 19, "travel days follow the edited length");

const removed = deleteJourney(state, userA, third.id);
assert(removed.ok, "delete");
if (!removed.ok) throw new Error("narrow");
state = removed.state;
assert(account()?.slotCapacity === 3, "delete keeps the purchased slot");
assert(account()?.points === 0, "delete does not refund");
assert(travelDays(state, userA) === 14, "deleted journey leaves the total");
assert(ownedJourneyCount(state, userA) === 2, "one slot is open again");

const again = commitJourney(state, userA, input("再一份", 8));
assert(again.ok, "open slot can be filled without points");
if (!again.ok) throw new Error("narrow");
state = again.state;
assert(state.journeys.find((journey) => journey.id === again.id)?.days === 8, "new journey keeps its own days");
assert(travelDays(state, userA) === 22, "replacement adds only its own days");

const copyBlocked = copyJourney(state, userA, first.id, "2026-12-01");
assert(!copyBlocked.ok, "copy needs an open slot");

state = grantPoints(state, userA, 100);
const extra = buySlot(state, userA);
assert(extra.ok, "buy another slot");
if (!extra.ok) throw new Error("narrow");
state = extra.state;
const copied = copyJourney(state, userA, first.id, "2026-12-01");
assert(copied.ok, "copy uses the open slot");
if (!copied.ok) throw new Error("narrow");
state = copied.state;
const copy = state.journeys.find((journey) => journey.id === copied.id);
assert(copy?.startDate === "2026-12-01", "copy uses the chosen start date");
assert(copy?.days === 9, "copy uses the source list's current days");
assert(account()?.points === 0, "copy does not spend points");

const beforeShareEdit = travelDays(state, userA);
const shared = setSharePermission(state, userA, first.id, "read_only");
assert(shared.ok, "share");
if (!shared.ok) throw new Error("narrow");
state = shared.state;
const token = shared.token;
const changed = setSharePermission(state, userA, first.id, "editable");
assert(changed.ok && changed.token === token, "permission change keeps token");
if (!changed.ok) throw new Error("narrow");
state = changed.state;

const opened = openShare(state, userB, token);
assert(opened.ok, "b joins editable share");
if (!opened.ok) throw new Error("narrow");
state = opened.state;
const memberEdit = updateJourneyMeta(state, userB, first.id, { days: 2 });
assert(memberEdit.ok, "editor can change days");
if (!memberEdit.ok) throw new Error("narrow");
state = memberEdit.state;
assert(travelDays(state, userA) === beforeShareEdit - 7, "shared edit changes the owner's current total");

const locked = setSharePermission(state, userA, first.id, "read_only");
assert(locked.ok, "back to read only");
if (!locked.ok) throw new Error("narrow");
state = locked.state;
const denied = updateJourneyMeta(state, userB, first.id, { days: 2 });
assert(!denied.ok, "read only removes edit access");

const quote = quoteCreate(state.users.find((user) => user.id === userB)!, ownedJourneyCount(state, userB));
assert(quote.allowed && quote.openSlots === 2, "shared list does not occupy B's slots");

const legacy = hydrateState({
  users: [{ id: userA, name: "旅人甲", email: "traveler-a@example.com", points: 40, freeJourneysUsed: 1 }],
  journeys: [
    {
      id: "legacy",
      ownerId: userA,
      name: "舊清單",
      location: "京都",
      days: 3,
      purpose: "",
      startDate: "2026-10-29",
      endDate: "2026-10-31",
      mode: "detail",
      createdAt: "2026-10-29T00:00:00.000Z",
    },
  ],
  sessionUserId: userA,
});
assert(legacy.journeys.find((journey) => journey.id === "legacy")?.days === 3, "old saves keep their days");
assert(legacy.users.find((user) => user.id === userA)?.slotCapacity === 2, "old saves keep two slots");
assert(travelDays(legacy, userA) === 3, "hydrated total uses current days");

console.log("domain checks passed");
