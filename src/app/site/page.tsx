import { SiteScreen } from "@/components/site-screen";
import { RequireUser } from "@/components/ui";

export const instant = false;

export default function Page() {
  return (
    <RequireUser>
      <SiteScreen />
    </RequireUser>
  );
}
