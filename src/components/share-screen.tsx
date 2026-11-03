"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isIsoDate, todayISO } from "@/lib/dates";
import { bagsFor, itemsFor, journeyItemName, ownedJourneyCount, quoteCreate } from "@/lib/domain";
import { useStore } from "@/lib/store";
import { BagGlyph, ErrorText, Phone } from "@/components/ui";

export function ShareScreen({ token }: { token: string }) {
  const store = useStore();
  const router = useRouter();
  const [copyError, setCopyError] = useState("");
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyDate, setCopyDate] = useState(todayISO());
  const share = store.state.shares.find((entry) => entry.token === token);
  const journey = share
    ? store.state.journeys.find((entry) => entry.id === share.journeyId)
    : undefined;
  const joined = Boolean(
    share &&
      store.user &&
      (share.createdBy === store.user.id ||
        store.state.shareMembers.some(
          (member) => member.shareId === share.id && member.userId === store.user?.id,
        )),
  );

  useEffect(() => {
    if (!share || share.permission !== "editable") return;
    if (!joined) {
      store.acceptShare(token);
      return;
    }
    router.replace(`/journey/${share.journeyId}`);
  }, [joined, router, share, store, token]);

  if (!store.user) return null;

  return (
    <Phone>
      <main className="flex flex-col gap-3 p-4">
        <Link href="/" className="text-sm underline">
          主頁
        </Link>
        <h1 className="text-xl font-black">{journey?.name ?? "分享清單"}</h1>
        {!share && <ErrorText>找不到這份分享</ErrorText>}
        <ErrorText>{copyError}</ErrorText>
        {share?.permission === "read_only" && journey && (
          <>
            <p className="text-sm">這份是唯讀。想自己改的話，可以複製一份。</p>
            {bagsFor(store.state, journey.id).map((bag) => (
              <section key={bag.id} className="wire-card">
                <h2 className="flex items-center gap-2 font-black">
                  <BagGlyph type={bag.type} />
                  {bag.name}
                </h2>
                <ul className="mt-2 text-sm">
                  {itemsFor(store.state, journey.id)
                    .filter((item) => item.bagId === bag.id)
                    .map((item) => (
                      <li key={item.id}>{journeyItemName(store.state, item)}</li>
                    ))}
                </ul>
              </section>
            ))}
            <button
              type="button"
              data-testid="copy-shared"
              className="wire-btn wire-btn-primary"
              onClick={() => {
                if (!store.user) return;
                const quote = quoteCreate(store.user, ownedJourneyCount(store.state, store.user.id));
                if (!quote.allowed) {
                  setCopyError(quote.reason ?? "沒有空的旅程欄位");
                  return;
                }
                setCopyOpen(true);
                setCopyError("");
              }}
            >
              複製一份
            </button>
            {copyOpen && (
              <form
                className="wire-card flex flex-col gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!isIsoDate(copyDate)) {
                    setCopyError("請選出發日");
                    return;
                  }
                  const result = store.copy(journey.id, copyDate, token);
                  if (!result.ok) {
                    setCopyError(result.reason);
                    return;
                  }
                  router.push(`/journey/${result.id}`);
                }}
              >
                <p className="text-sm">複製會佔用你自己的一個旅程欄位。</p>
                <label className="wire-field">
                  出發日
                  <input data-testid="copy-start" type="date" value={copyDate} onChange={(event) => setCopyDate(event.target.value)} required />
                </label>
                <button type="submit" className="wire-btn wire-btn-primary">佔用欄位並複製</button>
              </form>
            )}
          </>
        )}
        {share?.permission === "editable" && <p className="text-sm">正在打開可編輯清單</p>}
      </main>
    </Phone>
  );
}
