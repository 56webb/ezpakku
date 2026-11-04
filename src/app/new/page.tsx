import type { Metadata } from "next";
import { WizardScreen } from "@/components/wizard-screen";
import { RequireUser } from "@/components/ui";

export const instant = false;

export const metadata: Metadata = {
  title: "新建清單 · EZpakku",
  description: "建立旅行打包清單",
};

export default function Page() {
  return (
    <RequireUser>
      <WizardScreen />
    </RequireUser>
  );
}
