import { ShareScreen } from "@/components/share-screen";
import { RequireUser } from "@/components/ui";

export const instant = false;

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <RequireUser>
      <ShareScreen key={token} token={token} />
    </RequireUser>
  );
}
