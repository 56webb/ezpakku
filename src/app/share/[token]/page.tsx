import type { Metadata } from "next";
import { ShareScreen } from "@/components/share-screen";
import { RequireUser } from "@/components/ui";

export const instant = false;

export const metadata: Metadata = {
  title: "分享清單 · EZpakku",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <RequireUser>
      <ShareScreen key={token} token={token} />
    </RequireUser>
  );
}
