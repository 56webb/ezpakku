"use client";

import { useSyncExternalStore } from "react";
import {
  getCatalogServerSnapshot,
  getCatalogSnapshot,
  subscribeCatalog,
  updateCatalog,
  resetCatalog,
} from "@/lib/catalog/local";
import type {
  CatalogAffiliate,
  CatalogBagPreset,
  CatalogItemRow,
  CatalogItemRule,
  CatalogState,
} from "@/lib/catalog/types";

export function useCatalog(): CatalogState | null {
  return useSyncExternalStore(subscribeCatalog, getCatalogSnapshot, getCatalogServerSnapshot);
}

export function useCatalogActions() {
  return {
    upsertItem(item: CatalogItemRow) {
      updateCatalog((state) => {
        const exists = state.items.some((entry) => entry.id === item.id);
        return {
          ...state,
          items: exists
            ? state.items.map((entry) => (entry.id === item.id ? item : entry))
            : [...state.items, item],
        };
      });
    },
    removeItem(id: string) {
      updateCatalog((state) => ({
        ...state,
        items: state.items.filter((entry) => entry.id !== id),
        rules: state.rules.filter((rule) => rule.itemId !== id),
      }));
    },
    upsertAffiliate(affiliate: CatalogAffiliate) {
      updateCatalog((state) => {
        const exists = state.affiliates.some((entry) => entry.id === affiliate.id);
        return {
          ...state,
          affiliates: exists
            ? state.affiliates.map((entry) => (entry.id === affiliate.id ? affiliate : entry))
            : [...state.affiliates, affiliate],
        };
      });
    },
    removeAffiliate(id: string) {
      updateCatalog((state) => ({
        ...state,
        affiliates: state.affiliates.filter((entry) => entry.id !== id),
        items: state.items.map((item) =>
          item.affiliateId === id ? { ...item, affiliateId: null, affiliateUrl: null } : item
        ),
      }));
    },
    upsertRule(rule: CatalogItemRule) {
      updateCatalog((state) => {
        const exists = state.rules.some((entry) => entry.itemId === rule.itemId);
        return {
          ...state,
          rules: exists
            ? state.rules.map((entry) => (entry.itemId === rule.itemId ? rule : entry))
            : [...state.rules, rule],
        };
      });
    },
    removeRule(itemId: string) {
      updateCatalog((state) => ({
        ...state,
        rules: state.rules.filter((entry) => entry.itemId !== itemId),
      }));
    },
    upsertPreset(preset: CatalogBagPreset) {
      updateCatalog((state) => {
        const exists = state.presets.some((entry) => entry.id === preset.id);
        return {
          ...state,
          presets: exists
            ? state.presets.map((entry) => (entry.id === preset.id ? preset : entry))
            : [...state.presets, preset],
        };
      });
    },
    removePreset(id: string) {
      updateCatalog((state) => ({
        ...state,
        presets: state.presets.filter((entry) => entry.id !== id),
      }));
    },
    reset() {
      resetCatalog();
    },
  };
}
