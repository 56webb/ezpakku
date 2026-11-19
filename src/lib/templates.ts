import { itemIds } from "@/lib/seed";

export type TemplateInput = {
  location: string;
  days: number;
  purpose: string;
};

/**
 * 細節控進入物品頁時自動勾選的建議清單。
 * 含圖片常用組＋依天數／地點／目的加碼。
 */
export function templateItemIds(input: TemplateInput): string[] {
  const place = `${input.location}${input.purpose}`;
  const ids = new Set<string>([
    // 圖片常用組
    itemIds.charger,
    itemIds.powerbank,
    itemIds.extensionCord,
    itemIds.meds,
    itemIds.thermometer,
    itemIds.masks,
    itemIds.quickDryTowel,
    itemIds.facewash,
    itemIds.bathScrub,
    itemIds.pajamas,
    itemIds.dailyClothes,
    itemIds.shirt,
    itemIds.underwear,
    itemIds.pants,
    itemIds.socks,
    itemIds.umbrella,
    itemIds.slippers,
    itemIds.sandals,
    itemIds.ecoBag,
    itemIds.nailKit,
    // 基本證件／盥洗
    itemIds.passport,
    itemIds.wallet,
    itemIds.toothbrush,
    itemIds.toothpaste,
  ]);

  if (input.days >= 3) {
    ids.add(itemIds.shampoo);
    ids.add(itemIds.laundry);
  }
  if (input.days >= 5) {
    ids.add(itemIds.shirtExtra);
    ids.add(itemIds.dirtyLaundryBag);
  }
  if (input.days >= 7) {
    ids.add(itemIds.jacket);
  }
  if (/海|灘|島|沖繩|墾丁/.test(place)) {
    ids.add(itemIds.swimsuit);
    ids.add(itemIds.sunscreen);
  }
  if (/山|露營|登山/.test(place)) {
    ids.add(itemIds.fleece);
    ids.add(itemIds.headlamp);
  }
  if (/雪|北海道|冰島|寒流|歐洲|法國|德國/.test(place)) {
    ids.add(itemIds.thermal);
    ids.add(itemIds.gloves);
    ids.add(itemIds.scarfSet);
  }
  if (/商務|工作|會議|出差/.test(input.purpose)) {
    ids.add(itemIds.suit);
    ids.add(itemIds.laptop);
  }
  if (/蜜月|約會|婚|拍攝/.test(input.purpose)) {
    ids.add(itemIds.outfit);
    ids.add(itemIds.invisibleBra);
  }
  if (/出國|日本|韓國|美國|歐洲|泰國|越南|新加坡/.test(place)) {
    ids.add(itemIds.passportCopy);
    ids.add(itemIds.plugAdapter);
  }

  return [...ids];
}

/** 把規則引擎產生的名稱對回 catalog 物品（對得上就用 itemId，勾選才會亮）。 */
export function matchCatalogItemId(
  label: string,
  categoryId: string,
  catalog: { id: string; name: string; categoryId: string }[],
): string | null {
  const base = label.replace(/\s*×\d+\s*$/u, "").trim();
  if (!base) return null;
  const exact = catalog.find((item) => item.name === base);
  if (exact) return exact.id;
  const sameCategory = catalog.filter((item) => item.categoryId === categoryId);
  const contains = sameCategory.find(
    (item) => base.includes(item.name) || item.name.includes(base),
  );
  if (contains) return contains.id;
  const any = catalog.find((item) => base.includes(item.name) || item.name.includes(base));
  return any?.id ?? null;
}
