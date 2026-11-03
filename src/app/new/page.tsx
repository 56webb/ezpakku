import { WizardScreen } from "@/components/wizard-screen";
import { RequireUser } from "@/components/ui";

export const instant = false;

export default function Page() {
  return (
    <RequireUser>
      <WizardScreen />
    </RequireUser>
  );
}
