/** 選包畫面左側可換的旅行者立繪（傳統 RO 風格）。檔案在 public/travelers/。 */

export type Traveler = {
  id: string;
  name: string;
  src: string;
};

/** 以使用者認定的好圖為主；冬旅／初心者由 AGY 依同風格補齊。 */
export const travelers: Traveler[] = [
  { id: "tourist", name: "觀光客", src: "/travelers/tourist.png" },
  { id: "city", name: "城市", src: "/travelers/city.png" },
  { id: "camper", name: "露營", src: "/travelers/camper.png" },
  { id: "winter", name: "冬旅", src: "/travelers/winter.png" },
  { id: "novice", name: "初心者", src: "/travelers/novice.png" },
];

export const DEFAULT_TRAVELER_ID = travelers[0].id;

export function getTraveler(id: string | null | undefined): Traveler {
  return travelers.find((traveler) => traveler.id === id) ?? travelers[0];
}
