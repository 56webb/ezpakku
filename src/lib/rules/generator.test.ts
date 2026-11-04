import { describe, expect, it } from "vitest";
import {
  calcQty,
  countryCodeFromName,
  generatePackingList,
  isCheckedBag,
  packingWarnings,
  tempToClimate,
} from "@/lib/rules/generator";

describe("規則引擎基礎", () => {
  it("國家名對到國碼", () => {
    expect(countryCodeFromName("日本")).toBe("JP");
    expect(countryCodeFromName("台灣")).toBe("TW");
    expect(countryCodeFromName("")).toBeNull();
  });

  it("溫度對氣候", () => {
    expect(tempToClimate(28)).toBe("hot");
    expect(tempToClimate(20)).toBe("warm");
    expect(tempToClimate(12)).toBe("cool");
    expect(tempToClimate(5)).toBe("cold");
  });

  it("數量公式", () => {
    expect(calcQty(2, 5)).toBe(2);
    expect(calcQty({ perDay: 1, extra: 1, min: 2, max: 7 }, 5)).toBe(6);
    expect(calcQty({ perDay: 1, max: 3 }, 10)).toBe(3);
  });
});

describe("generatePackingList", () => {
  it("出國日本會有護照與兩包（隨身＋托運）", () => {
    const packing = generatePackingList({
      countryName: "日本",
      startDate: "2026-07-01",
      days: 5,
      types: ["city"],
      luggage: "checked",
      climate: "warm",
    });
    expect(packing.meta.international).toBe(true);
    expect(packing.meta.countryCode).toBe("JP");
    expect(packing.bags).toHaveLength(2);
    expect(packing.bags[0].kind).toBe("personal");
    expect(packing.bags[1].kind).toBe("checked");
    expect(packing.items.some((item) => item.templateId === "passport")).toBe(true);
  });

  it("台灣國內不帶護照", () => {
    const packing = generatePackingList({
      countryName: "台灣",
      startDate: "2026-07-01",
      days: 3,
      types: ["city"],
      luggage: "carryon7",
      climate: "hot",
    });
    expect(packing.meta.international).toBe(false);
    expect(packing.bags[1].kind).toBe("carryon");
    expect(packing.items.some((item) => item.templateId === "passport")).toBe(false);
  });

  it("海島行程會出現泳衣相關物品", () => {
    const packing = generatePackingList({
      countryName: "泰國",
      startDate: "2026-08-01",
      days: 4,
      types: ["beach"],
      luggage: "checked",
      climate: "hot",
    });
    expect(packing.items.some((item) => /泳衣|泳褲|海邊/.test(item.customName) || item.templateId.includes("swim"))).toBe(
      true,
    );
  });

  it("minDays：頸枕要滿 4 天才出現", () => {
    const shortTrip = generatePackingList({
      countryName: "日本",
      startDate: "2026-07-01",
      days: 3,
      types: ["city"],
      luggage: "checked",
      climate: "warm",
    });
    const longTrip = generatePackingList({
      countryName: "日本",
      startDate: "2026-07-01",
      days: 4,
      types: ["city"],
      luggage: "checked",
      climate: "warm",
    });
    const hasPillow = (packing: typeof shortTrip) =>
      packing.items.some((item) => item.templateId === "pillow");
    expect(hasPillow(shortTrip)).toBe(false);
    expect(hasPillow(longTrip)).toBe(true);
  });
});

describe("托運警告", () => {
  it("托運箱放行動電源標籤會警告", () => {
    expect(isCheckedBag({ name: "托運行李箱", type: "suitcase", kind: "checked" })).toBe(true);
    const warnings = packingWarnings(
      [
        { id: "personal", name: "隨身", type: "backpack" },
        { id: "checked", name: "托運行李箱", type: "suitcase" },
      ],
      [{ bagId: "checked", tags: ["powerbank"] }],
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0].itemTags).toContain("powerbank");
  });
});
