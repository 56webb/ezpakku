"use client";

import { useEffect } from "react";
import { useCatalog } from "@/hooks/use-catalog";
import { fetchCloudCatalog } from "@/lib/catalog/cloud";
import { updateCatalog } from "@/lib/catalog/local";
import { systemCategories } from "@/lib/seed";
import { BottomNav, Phone } from "@/components/ui";

export function CatalogScreen() {
  const catalog = useCatalog();
  const items = catalog?.items.filter((item) => item.isActive) ?? [];
  const affiliates = catalog?.affiliates ?? [];

  useEffect(() => {
    let cancelled = false;
    void fetchCloudCatalog().then((cloud) => {
      if (cancelled || !cloud?.items?.length) return;
      updateCatalog((current) => ({
        ...current,
        items: cloud.items ?? current.items,
        affiliates: cloud.affiliates ?? current.affiliates,
      }));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Phone
      header={
        <header className="border-b border-[var(--line)] px-4 py-3">
          <h1 className="text-xl font-black">所有物品</h1>
        </header>
      }
      footer={<BottomNav />}
    >
      <main>
        <p className="px-4 py-3 text-sm leading-6">
          系統物品資料庫。有導購連結的項目目前都是示意網址。
          {catalog ? `（catalog v${catalog.version}）` : "（載入中）"}
        </p>
        {systemCategories.map((category) => {
          const rows = items.filter((item) => item.categoryId === category.id);
          if (rows.length === 0) return null;
          return (
            <section key={category.id}>
              <h2 className="category-head text-base font-black">{category.name}</h2>
              <ul>
                {rows.map((item) => {
                  const affiliate = item.affiliateId
                    ? affiliates.find((entry) => entry.id === item.affiliateId && entry.isActive)
                    : null;
                  const url = affiliate?.url ?? item.affiliateUrl;
                  return (
                    <li key={item.id} className="border-b border-black/20 px-4 py-3">
                      <p className="font-bold">{item.name}</p>
                      <p className="text-sm">{item.description}</p>
                      {url ? (
                        <a
                          data-testid="item-affiliate"
                          className="text-sm font-bold underline"
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {url.includes("example.com") ? "導購連結（示意，上線前更換）" : "聯盟導購"}
                        </a>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        {!catalog ? <p className="px-4 py-6 text-sm text-[var(--ink-soft)]">載入 catalog…</p> : null}
        {catalog && items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--ink-soft)]">目前沒有上架物品。</p>
        ) : null}
      </main>
    </Phone>
  );
}
