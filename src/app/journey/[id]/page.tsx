import { JourneyScreen } from "@/components/journey-screen";
import { RequireUser } from "@/components/ui";

export const instant = false;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RequireUser>
      <JourneyScreen key={id} journeyId={id} />
    </RequireUser>
  );
}
