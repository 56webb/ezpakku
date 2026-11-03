import { itemIds } from "@/lib/seed";

export type TemplateInput = {
  location: string;
  days: number;
  purpose: string;
};

/**
 * 暫定規則，還沒跟使用者定案。
 * 天數只決定「要不要出現這項」，不複製多件。
 * 地點關鍵字看地點＋目的；商務／約會只看目的。
 */
export function templateItemIds(input: TemplateInput): string[] {
  const place = `${input.location}${input.purpose}`;
  const ids = new Set<string>([
    itemIds.passport,
    itemIds.wallet,
    itemIds.charger,
    itemIds.toothbrush,
    itemIds.toothpaste,
    itemIds.underwear,
    itemIds.shirt,
    itemIds.pants,
    itemIds.socks,
    itemIds.meds,
  ]);

  if (input.days >= 3) {
    ids.add(itemIds.shampoo);
    ids.add(itemIds.slippers);
  }
  if (input.days >= 5) {
    ids.add(itemIds.laundry);
    ids.add(itemIds.shirtExtra);
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
  if (/雪|北海道|冰島|寒流/.test(place)) {
    ids.add(itemIds.thermal);
    ids.add(itemIds.gloves);
  }
  if (/商務|工作|會議|出差/.test(input.purpose)) {
    ids.add(itemIds.suit);
    ids.add(itemIds.laptop);
  }
  if (/蜜月|約會/.test(input.purpose)) {
    ids.add(itemIds.outfit);
  }

  return [...ids];
}
