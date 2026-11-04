import type { Metadata } from "next";
import { SiteScreen } from "@/components/site-screen";
import { RequireUser } from "@/components/ui";

export const instant = false;

export const metadata: Metadata = {
  title: "關於 EZpakku",
  description: "EZpakku 官網佔位頁",
};

export default function Page() {
  return (
    <RequireUser>
      <SiteScreen />
    </RequireUser>
  );
}
