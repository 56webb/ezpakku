"use client";

import Link from "next/link";
import { useState } from "react";
import { POINTS_PER_SLOT } from "@/lib/constants";
import { bagsFor, ownedJourneyCount } from "@/lib/domain";
import { formatRange } from "@/lib/dates";
import { useStore } from "@/lib/store";
import { BagGlyph, BottomNav, ErrorText, Phone } from "@/components/ui";

export function HomeScreen() {
  const store = useStore();
  const user = store.user;
  const [error, setError] = useState("");
  const [buying, setBuying] = useState(false);
  if (!user || !store.quote) return null;

  const owned = ownedJourneyCount(store.state, user.id);
  const emptySlots = Math.max(0, user.slotCapacity - owned);

  return (
    <Phone
      header={
        <header className="flex items-start justify-between gap-3 border-b-2 border-black px-4 py-3">
          <div>
            <p data-testid="points-balance" className="text-lg font-black">
              {user.points} 點
            </p>
            <p className="text-xs">旅程欄位 {owned}/{user.slotCapacity}</p>
            <button type="button" data-testid="grant-points" className="mt-2 text-left text-xs underline" onClick={store.grantDemoPoints}>
              線框暫代購買：加 {POINTS_PER_SLOT} 點
            </button>
          </div>
          <div className="text-right">
            <p data-testid="account-name" className="font-black">
              {user.name}
            </p>
            <p data-testid="travel-days" className="text-sm">
              累計 {store.travelDayCount} 天
            </p>
            <button type="button" data-testid="sign-out" className="mt-2 text-sm underline" onClick={store.signOut}>
              登出
            </button>
          </div>
        </header>
      }
      footer={<BottomNav />}
    >
      <main className="flex flex-col gap-3 p-4">
        <h1 className="text-xl font-black">我的清單</h1>
        <p className="text-xs leading-5">線框模式：清單存在這台手機的瀏覽器裡，還沒同步到雲端。</p>
        <ErrorText>{error}</ErrorText>
        {store.journeys.map(({ journey, shared }) => {
          const bags = bagsFor(store.state, journey.id);
          return (
            <Link
              key={journey.id}
              href={`/journey/${journey.id}`}
              data-testid="journey-card"
              className="wire-card block"
            >
              <span className="block text-lg font-black">{journey.name}</span>
              {shared && <span className="text-xs font-bold">共用</span>}
              <span className="mt-2 flex gap-2">
                {bags.map((bag) => (
                  <BagGlyph key={bag.id} type={bag.type} />
                ))}
              </span>
              <span className="mt-2 block text-sm">{formatRange(journey.startDate, journey.endDate)}</span>
            </Link>
          );
        })}
        {Array.from({ length: emptySlots }, (_, index) => (
          <Link key={`free-${index}`} href="/new" data-testid="slot-free" className="wire-card block text-center font-black">
            空欄位
          </Link>
        ))}
        <button
          type="button"
          data-testid="slot-plus"
          className="wire-card text-center font-black"
          onClick={() => {
            if (owned < user.slotCapacity) {
              setBuying(false);
              setError("還有空欄位。這一格是用點數永久加欄位，加了就不會因為刪除清單而消失。");
              return;
            }
            if (user.points < POINTS_PER_SLOT) {
              setBuying(false);
              setError(`點數不足。${POINTS_PER_SLOT} 點可以永久增加一個旅程欄位。`);
              return;
            }
            setError("");
            setBuying(true);
          }}
        >
          + {POINTS_PER_SLOT} 點永久加一格
        </button>
        {buying && (
          <div className="wire-card flex flex-col gap-2">
            <p className="text-sm">用 {POINTS_PER_SLOT} 點永久增加一個旅程欄位？刪掉清單不會把這一格收回。</p>
            <button
              type="button"
              data-testid="confirm-buy-slot"
              className="wire-btn wire-btn-primary"
              onClick={() => {
                const result = store.buySlot();
                setBuying(false);
                setError(result.ok ? "" : result.reason);
              }}
            >
              確定加一格
            </button>
          </div>
        )}
      </main>
    </Phone>
  );
}
