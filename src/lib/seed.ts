import { categoryId, itemId } from "@/lib/ids";
import type { CatalogItem, Category } from "@/lib/types";

export const categoryIds = {
  clothes: categoryId(1),
  toiletry: categoryId(2),
  electronics: categoryId(3),
  docs: categoryId(4),
  health: categoryId(5),
  misc: categoryId(6),
} as const;

export const itemIds = {
  underwear: itemId(1),
  shirt: itemId(2),
  shirtExtra: itemId(3),
  pants: itemId(4),
  socks: itemId(5),
  jacket: itemId(6),
  swimsuit: itemId(7),
  thermal: itemId(8),
  suit: itemId(9),
  outfit: itemId(10),
  fleece: itemId(11),
  gloves: itemId(12),
  toothbrush: itemId(13),
  toothpaste: itemId(14),
  shampoo: itemId(15),
  sunscreen: itemId(16),
  facewash: itemId(17),
  charger: itemId(18),
  laptop: itemId(19),
  headlamp: itemId(20),
  powerbank: itemId(21),
  passport: itemId(22),
  wallet: itemId(23),
  meds: itemId(24),
  personalMeds: itemId(25),
  masks: itemId(26),
  laundry: itemId(27),
  slippers: itemId(28),
  umbrella: itemId(29),
} as const;

export const systemCategories: Category[] = [
  { id: categoryIds.clothes, name: "衣物", isSystem: true, userId: null, sortOrder: 0 },
  { id: categoryIds.toiletry, name: "盥洗", isSystem: true, userId: null, sortOrder: 1 },
  { id: categoryIds.electronics, name: "電子", isSystem: true, userId: null, sortOrder: 2 },
  { id: categoryIds.docs, name: "證件", isSystem: true, userId: null, sortOrder: 3 },
  { id: categoryIds.health, name: "健康", isSystem: true, userId: null, sortOrder: 4 },
  { id: categoryIds.misc, name: "其他", isSystem: true, userId: null, sortOrder: 5 },
];

const affiliate = (slug: string) => `https://example.com/go/${slug}`;

export const systemItems: CatalogItem[] = [
  item(itemIds.underwear, categoryIds.clothes, "內褲", "依行程天數自行多帶"),
  item(itemIds.shirt, categoryIds.clothes, "上衣", "日常替換"),
  item(itemIds.shirtExtra, categoryIds.clothes, "備用上衣", "天數較長時多帶一件"),
  item(itemIds.pants, categoryIds.clothes, "長褲", "至少一條"),
  item(itemIds.socks, categoryIds.clothes, "襪子", "依天數準備"),
  item(itemIds.jacket, categoryIds.clothes, "外套", "晚上或冷氣房"),
  item(itemIds.swimsuit, categoryIds.clothes, "泳衣", "海邊或泳池"),
  item(itemIds.thermal, categoryIds.clothes, "保暖衣", "低溫行程"),
  item(itemIds.suit, categoryIds.clothes, "正式服裝", "商務場合"),
  item(itemIds.outfit, categoryIds.clothes, "一套較正式的衣服", "約會或晚餐"),
  item(itemIds.fleece, categoryIds.clothes, "刷毛外套", "登山或露營"),
  item(itemIds.gloves, categoryIds.clothes, "手套", "寒冷天氣"),
  item(itemIds.toothbrush, categoryIds.toiletry, "牙刷", "個人盥洗"),
  item(itemIds.toothpaste, categoryIds.toiletry, "牙膏", "個人盥洗"),
  item(itemIds.shampoo, categoryIds.toiletry, "洗髮精", "三天以上較常用到"),
  item(itemIds.sunscreen, categoryIds.toiletry, "防曬", "日照強的地方", affiliate("sunscreen")),
  item(itemIds.facewash, categoryIds.toiletry, "洗面乳", "日常清潔"),
  item(itemIds.charger, categoryIds.electronics, "手機充電器", "含傳輸線", affiliate("charger")),
  item(itemIds.laptop, categoryIds.electronics, "筆電", "需要工作時"),
  item(itemIds.headlamp, categoryIds.electronics, "頭燈", "露營或夜間步行"),
  item(itemIds.powerbank, categoryIds.electronics, "行動電源", "長時間在外面", affiliate("powerbank")),
  item(itemIds.passport, categoryIds.docs, "護照", "出國證件，建議另備影本", affiliate("passport")),
  item(itemIds.wallet, categoryIds.docs, "錢包", "現金與卡片"),
  item(itemIds.meds, categoryIds.health, "常備藥", "止痛、腸胃、過敏"),
  item(itemIds.personalMeds, categoryIds.health, "個人藥品", "處方或固定服用"),
  item(itemIds.masks, categoryIds.health, "口罩", "機艙或備用"),
  item(itemIds.laundry, categoryIds.misc, "洗衣袋", "五天以上方便送洗"),
  item(itemIds.slippers, categoryIds.misc, "拖鞋", "住宿使用"),
  item(itemIds.umbrella, categoryIds.misc, "雨傘", "突然下雨"),
];

function item(
  id: string,
  categoryIdValue: string,
  name: string,
  description: string,
  affiliateUrl: string | null = null,
): CatalogItem {
  return {
    id,
    categoryId: categoryIdValue,
    name,
    description,
    affiliateUrl,
    isActive: true,
  };
}
