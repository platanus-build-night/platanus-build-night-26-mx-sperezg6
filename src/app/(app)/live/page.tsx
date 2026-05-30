import { Topbar } from "@/components/shell/Topbar";
import { SetupNotice } from "@/components/ui/SetupNotice";
import { LiveGrid } from "@/components/runs/LiveGrid";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getLiveSpecs } from "@/lib/runs-data";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  if (!isSupabaseConfigured()) {
    return (
      <>
        <Topbar title="Vista en vivo" />
        <div className="px-4 py-8 sm:px-8">
          <SetupNotice />
        </div>
      </>
    );
  }

  const specs = await getLiveSpecs();

  return (
    <>
      <Topbar title="Vista en vivo" />
      <div className="px-4 py-8 sm:px-8">
        <LiveGrid initial={specs} />
      </div>
    </>
  );
}
