export const FREE_JOURNEY_LIMIT = 2;
export const POINTS_PER_SLOT = 100;
export const STORAGE_KEY = "ezpakku-state-v1";
export const DRAFT_KEY = "ezpakku-draft-v1";
export const OAUTH_FLAG = "ezpakku-oauth";

export const LOGIN_DISCLAIMER =
  "使用 Google 帳號僅用於同步與分享清單，不會寄送廣告信，也不會將資料用於其他用途。";

export const BAG_TYPES = [
  { id: "suitcase", label: "行李箱" },
  { id: "backpack", label: "後背包" },
  { id: "sling", label: "斜背包" },
  { id: "anti_theft", label: "防盜包" },
  { id: "pouch", label: "化妝包" },
  { id: "wallet", label: "錢包" },
  { id: "custom", label: "自訂" },
] as const;

/** 素材庫 128px 圖。自訂沒有對應檔。防盜包暫用腰包。 */
export const BAG_ICONS: Partial<Record<(typeof BAG_TYPES)[number]["id"], string>> = {
  suitcase: "/bags/suitcase.png",
  backpack: "/bags/backpack.png",
  sling: "/bags/sling.png",
  anti_theft: "/bags/anti_theft.png",
  pouch: "/bags/pouch.png",
  wallet: "/bags/wallet.png",
};

export const BAG_COLORS = [
  "#111111",
  "#c0392b",
  "#e67e22",
  "#c9a227",
  "#1e8449",
  "#2471a3",
  "#7d3c98",
  "#d63384",
] as const;
