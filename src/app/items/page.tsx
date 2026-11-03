import { CatalogScreen } from "@/components/catalog-screen";
import { RequireUser } from "@/components/ui";

export const instant = false;

export default function Page() {
  return (
    <RequireUser>
      <CatalogScreen />
    </RequireUser>
  );
}
