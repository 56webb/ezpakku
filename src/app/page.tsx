import type { Metadata } from "next";
import { HomeScreen } from "@/components/home-screen";
import { RequireUser } from "@/components/ui";

export const instant = false;

export const metadata: Metadata = {
  title: "我的清單 · EZpakku",
  description: "手機優先的旅行打包清單",
};

export default function Page() {
  return (
    <RequireUser>
      <HomeScreen />
    </RequireUser>
  );
}
