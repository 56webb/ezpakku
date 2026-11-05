import type { BAG_TYPES } from "@/lib/constants";

export type BagType = (typeof BAG_TYPES)[number]["id"];
export type ListMode = "detail" | "template";
export type SharePermission = "read_only" | "editable";

export type User = {
  id: string;
  name: string;
  email: string;
  points: number;
  slotCapacity: number;
  /** 本機／雲端：非 admin 示範點是否已領過 */
  demoPointsClaimed?: boolean;
};

export type Category = {
  id: string;
  name: string;
  isSystem: boolean;
  userId: string | null;
  sortOrder: number;
};

export type CatalogItem = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  affiliateUrl: string | null;
  isActive: boolean;
};

export type Journey = {
  id: string;
  ownerId: string;
  name: string;
  location: string;
  days: number;
  purpose: string;
  startDate: string;
  endDate: string;
  mode: ListMode;
  createdAt: string;
  /** ISO；雲端同步用。本機沒有時可缺。 */
  updatedAt?: string;
};

export type Bag = {
  id: string;
  journeyId: string;
  name: string;
  type: BagType;
  color: string;
  sortOrder: number;
  sealed: boolean;
};

export type JourneyItem = {
  id: string;
  journeyId: string;
  itemId: string | null;
  customName: string | null;
  categoryId: string;
  bagId: string;
  isChecked: boolean;
  sortOrder: number;
  tags: string[];
  note: string;
};

export type JourneyCategory = {
  journeyId: string;
  categoryId: string;
  sortOrder: number;
  collapseChecked: boolean;
};

export type Share = {
  id: string;
  journeyId: string;
  token: string;
  permission: SharePermission;
  createdBy: string;
};

export type ShareMember = {
  shareId: string;
  userId: string;
};

export type AppState = {
  users: User[];
  sessionUserId: string | null;
  categories: Category[];
  items: CatalogItem[];
  journeys: Journey[];
  bags: Bag[];
  journeyItems: JourneyItem[];
  journeyCategories: JourneyCategory[];
  shares: Share[];
  shareMembers: ShareMember[];
};

export type Quote = {
  allowed: boolean;
  openSlots: number;
  reason?: string;
};

export type NewJourneyInput = {
  mode: ListMode;
  location: string;
  days: number;
  purpose: string;
  name: string;
  startDate: string;
  bags: { name: string; type: BagType; color: string }[];
  categories: {
    id: string;
    name: string;
    isSystem: boolean;
    sortOrder: number;
    collapseChecked: boolean;
  }[];
  items: {
    itemId: string | null;
    customName: string | null;
    categoryId: string;
    bagIndex: number;
    tags?: string[];
    note?: string;
  }[];
};

export type Result<T> = ({ ok: true } & T) | { ok: false; reason: string };
