import { createBrowserClient } from "@supabase/ssr";
import { isSupabaseConfigured, supabaseKey, supabaseUrl } from "@/lib/supabase/env";

export function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase 環境變數還沒設定");
  }
  return createBrowserClient(supabaseUrl(), supabaseKey());
}
