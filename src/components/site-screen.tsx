"use client";

import { BottomNav, Phone } from "@/components/ui";

export function SiteScreen() {
  return (
    <Phone
      header={
        <header className="border-b-2 border-black px-4 py-3">
          <h1 className="text-xl font-black">官網</h1>
        </header>
      }
      footer={<BottomNav />}
    >
      <main className="flex flex-col gap-3 p-4">
        <p className="text-sm leading-6">底部導航有「官網」，但規格沒有網址，也沒有要放的內容。這個畫面先把位置留著。</p>
      </main>
    </Phone>
  );
}
