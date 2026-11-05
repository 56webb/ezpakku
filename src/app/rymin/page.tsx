import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminScreen } from "@/components/admin-screen";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export const metadata: Metadata = {
  title: "Catalog 後台 · EZpakku",
  robots: { index: false, follow: false },
};

export default async function Page() {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data: claimsData } = await supabase.auth.getClaims();
      const sub = claimsData?.claims?.sub;
      if (typeof sub !== "string" || !sub) notFound();
      const { data: profile } = await supabase.from("users").select("is_admin").eq("id", sub).maybeSingle();
      if (!profile?.is_admin) notFound();
    } catch {
      notFound();
    }
    return <AdminScreen />;
  }

  // 僅本機 development 且未設 Supabase 時可進（避免正式站漏 env 就敞開後台）
  if (process.env.NODE_ENV !== "development") notFound();
  return <AdminScreen />;
}
