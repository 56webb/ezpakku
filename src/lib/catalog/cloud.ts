import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { CatalogAffiliate, CatalogItemRow, CatalogState } from "@/lib/catalog/types";
import { createDefaultCatalog } from "@/lib/catalog/local";

/** 有雲端時讀上架物品／業配；失敗則回 null（呼叫端用本機）。 */
export async function fetchCloudCatalog(): Promise<Partial<CatalogState> | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const [{ data: items }, { data: affiliates }] = await Promise.all([
      supabase
        .from("items")
        .select(
          "id, category_id, name, description, template_key, default_bag, tags, note, affiliate_id, affiliate_url, is_active, sort_order",
        )
        .eq("is_active", true)
        .order("sort_order"),
      supabase.from("affiliates").select("id, key, label, url, platform, is_active").eq("is_active", true),
    ]);
    if (!items?.length) return null;

    const mappedItems: CatalogItemRow[] = items.map((item, index) => ({
      id: item.id as string,
      categoryId: item.category_id as string,
      name: item.name as string,
      description: (item.description as string) ?? "",
      templateKey: (item.template_key as string | null) ?? null,
      defaultBag: ((item.default_bag as string) === "personal" ? "personal" : "main") as "personal" | "main",
      tags: (item.tags as string[]) ?? [],
      note: (item.note as string) ?? "",
      affiliateId: (item.affiliate_id as string | null) ?? null,
      affiliateUrl: (item.affiliate_url as string | null) ?? null,
      isActive: Boolean(item.is_active),
      sortOrder: Number(item.sort_order ?? index),
    }));

    const mappedAffiliates: CatalogAffiliate[] = (affiliates ?? []).map((row) => ({
      id: row.id as string,
      key: row.key as string,
      label: row.label as string,
      url: row.url as string,
      platform: (row.platform as string) ?? "",
      isActive: Boolean(row.is_active),
    }));

    const base = createDefaultCatalog();
    return {
      items: mappedItems,
      affiliates: mappedAffiliates.length ? mappedAffiliates : base.affiliates,
      version: base.version,
    };
  } catch {
    return null;
  }
}
