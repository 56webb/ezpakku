"use client";

import { systemCategories, systemItems } from "@/lib/seed";
import { BottomNav, Phone } from "@/components/ui";

export function CatalogScreen() {
  return (
    <Phone header={<header className="border-b-2 border-black px-4 py-3"><h1 className="text-xl font-black">所有物品</h1></header>} footer={<BottomNav />}>
      <main>
        <p className="px-4 py-3 text-sm leading-6">系統物品資料庫。有導購連結的項目目前都是示意網址。</p>
        {systemCategories.map((category) => (
          <section key={category.id}>
            <h2 className="category-head text-base font-black">{category.name}</h2>
            <ul>
              {systemItems
                .filter((item) => item.categoryId === category.id && item.isActive)
                .map((item) => (
                  <li key={item.id} className="border-b border-black/20 px-4 py-3">
                    <p className="font-bold">{item.name}</p>
                    <p className="text-sm">{item.description}</p>
                    {item.affiliateUrl && (
                      <a
                        data-testid="item-affiliate"
                        className="text-sm font-bold underline"
                        href={item.affiliateUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        導購連結（示意）
                      </a>
                    )}
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </main>
    </Phone>
  );
}
