import type { Metadata } from "next";
import { CatalogScreen } from "@/components/catalog-screen";
import { RequireUser } from "@/components/ui";

export const instant = false;

export const metadata: Metadata = {
  title: "所有物品 · EZpakku",
  description: "系統打包物品與示意導購連結",
};

export default function Page() {
  return (
    <RequireUser>
      <CatalogScreen />
    </RequireUser>
  );
}
