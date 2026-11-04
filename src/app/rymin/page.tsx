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
  }
  // 沒設 Supabase：本機開發可進後台（只改 localStorage catalog）
  return <AdminScreen />;
}
