/** 第一版只抽常用字串；路由仍是單語 zh-Hant-TW。 */
export const zhTW = {
  brand: "EZpakku",
  myLists: "我的清單",
  points: "點",
  travelDays: (days: number) => `累計 ${days} 天`,
  slots: (owned: number, capacity: number) => `旅程欄位 ${owned}/${capacity}`,
  emptySlot: "空欄位",
  signOut: "登出",
  syncLocalOnly: "清單存在這台裝置的瀏覽器；登入 Google 後會同步到雲端。",
  affiliateDemo: "導購連結（示意）",
  affiliateLive: "聯盟導購",
  othersEditing: "其他人正在編輯這份清單",
} as const;
