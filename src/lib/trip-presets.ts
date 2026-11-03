import type { BagType } from "@/lib/types";

/** 通用範本的整份行程。資料由你之後放進來，現在先留空。 */
export type TripPreset = {
  id: string;
  name: string;
  summary: string;
  country: string;
  days: number;
  bags: {
    name: string;
    type: BagType;
    color: string;
    itemIds: string[];
  }[];
};

export const tripPresets: TripPreset[] = [];
