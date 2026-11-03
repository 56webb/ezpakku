import { HomeScreen } from "@/components/home-screen";
import { RequireUser } from "@/components/ui";

export const instant = false;

export default function Page() {
  return (
    <RequireUser>
      <HomeScreen />
    </RequireUser>
  );
}
