import type { BagType } from "@/lib/types";
import type { ClimateChoice, LuggagePlan, TravelType } from "@/lib/rules/generator";

export type CatalogAffiliate = {
  id: string;
  key: string;
  label: string;
  url: string;
  platform: string;
  isActive: boolean;
};

export type CatalogItemRow = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  templateKey: string | null;
  defaultBag: "personal" | "main";
  tags: string[];
  note: string;
  affiliateId: string | null;
  affiliateUrl: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type CatalogItemRule = {
  itemId: string;
  international: boolean | null;
  climates: ClimateChoice[];
  travelTypes: TravelType[];
  luggage: LuggagePlan[];
  needsAdapter: boolean | null;
  highVoltage: boolean | null;
  minDays: number | null;
};

export type CatalogPreviewInput = {
  country: string;
  days: number;
  travelType: TravelType;
  luggage: LuggagePlan;
  climate: ClimateChoice;
};

export type CatalogBagPreset = {
  id: string;
  key: string;
  name: string;
  summary: string;
  luggagePlan: LuggagePlan | null;
  isActive: boolean;
  sortOrder: number;
  bags: {
    id: string;
    name: string;
    type: BagType;
    color: string;
    kind: "personal" | "carryon" | "checked" | "other";
    sortOrder: number;
  }[];
};

export type CatalogSafetyTag = {
  id: string;
  label: string;
  title: string;
  detail: string;
  forbidChecked: boolean;
  internationalOnly: boolean;
};

export type CatalogState = {
  items: CatalogItemRow[];
  affiliates: CatalogAffiliate[];
  rules: CatalogItemRule[];
  presets: CatalogBagPreset[];
  safetyTags: CatalogSafetyTag[];
  version: number;
};
