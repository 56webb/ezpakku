import { describe, expect, it } from "vitest";
import { resolveBagIndex } from "@/lib/bag-prefs";

describe("resolveBagIndex", () => {
  const bags = [
    { type: "sling" as const, kind: "personal" },
    { type: "backpack" as const, kind: "other" },
    { type: "suitcase" as const, kind: "checked" },
  ];

  it("衣物志願：行李箱 > 後揹包 > 隨身包", () => {
    expect(resolveBagIndex(["suitcase", "backpack", "sling"], bags)).toBe(2);
  });

  it("行動電源志願：後揹包優先，不進托運箱", () => {
    expect(resolveBagIndex(["backpack", "anti_theft", "sling"], bags)).toBe(1);
  });

  it("證件志願：沒有防盜包時退到後揹包或隨身包", () => {
    expect(resolveBagIndex(["anti_theft", "wallet", "backpack", "sling"], bags)).toBe(1);
  });

  it("personal 別名會對到現有隨身類型", () => {
    expect(resolveBagIndex(["personal"], bags, "personal")).toBe(0);
  });
});
