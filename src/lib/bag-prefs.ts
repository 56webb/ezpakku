import type { BagType } from "@/lib/types";

/** 包包志願：具體類型，或 personal／main 別名。 */
export type BagPref = BagType | "personal" | "main";

export const CATEGORY_BAG_PREFS: Record<string, BagPref[]> = {
  clothes: ["suitcase", "backpack", "sling"],
  toiletries: ["pouch", "suitcase", "backpack", "sling"],
  toiletry: ["pouch", "suitcase", "backpack", "sling"],
  skincare: ["pouch", "suitcase", "backpack"],
  makeup: ["pouch", "suitcase", "backpack"],
  electronics: ["backpack", "anti_theft", "sling", "suitcase"],
  docs: ["anti_theft", "wallet", "backpack", "sling"],
  health: ["backpack", "pouch", "anti_theft", "suitcase"],
  misc: ["suitcase", "backpack", "sling"],
  outdoor: ["backpack", "suitcase", "sling"],
  event: ["suitcase", "backpack", "sling"],
  beach: ["suitcase", "backpack", "sling"],
  ski: ["suitcase", "backpack", "sling"],
  business: ["suitcase", "backpack", "sling"],
  kids: ["suitcase", "backpack", "sling"],
  custom: ["suitcase", "backpack", "sling"],
};

/** 隨身優先：斜背／防盜／錢包，再退到後揹包。 */
const PERSONAL_ORDER: BagType[] = ["sling", "anti_theft", "wallet", "pouch", "backpack"];
const MAIN_ORDER: BagType[] = ["suitcase", "custom", "pouch", "backpack"];

export function expandBagPref(pref: BagPref): BagType[] {
  if (pref === "personal") return PERSONAL_ORDER;
  if (pref === "main") return MAIN_ORDER;
  return [pref];
}

export function bagPrefsFromLegacy(
  bag: "personal" | "main" | undefined,
  category: string,
): BagPref[] {
  if (bag === "personal") return ["personal", "backpack", "sling", "anti_theft"];
  if (bag === "main") {
    return CATEGORY_BAG_PREFS[category] ?? ["suitcase", "backpack", "sling"];
  }
  return CATEGORY_BAG_PREFS[category] ?? ["suitcase", "backpack", "sling"];
}

type ResolvableBag = {
  type: BagType;
  kind?: string;
  name?: string;
};

/** 依志願序挑第一個現有包包；找不到就退到最後一個主行李／第一個包。 */
export function resolveBagIndex(
  prefs: BagPref[] | undefined,
  bags: ResolvableBag[],
  fallback: "personal" | "main" = "main",
): number {
  if (bags.length === 0) return 0;
  const ordered = (prefs?.length ? prefs : [fallback]).flatMap(expandBagPref);
  for (const type of ordered) {
    const index = bags.findIndex((bag) => bag.type === type);
    if (index >= 0) return index;
  }
  if (fallback === "personal") {
    const personal = bags.findIndex(
      (bag) => bag.kind === "personal" || PERSONAL_ORDER.includes(bag.type),
    );
    return personal >= 0 ? personal : 0;
  }
  const main = bags.findIndex(
    (bag) => bag.kind === "checked" || bag.kind === "carryon" || bag.type === "suitcase",
  );
  return main >= 0 ? main : bags.length - 1;
}

export function legacyBagFromPrefs(prefs: BagPref[]): "personal" | "main" {
  const first = prefs[0];
  if (!first) return "main";
  if (first === "personal" || PERSONAL_ORDER.includes(first as BagType)) return "personal";
  return "main";
}
