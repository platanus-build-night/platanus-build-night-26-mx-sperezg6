import { HelpCircle } from "lucide-react";
import { Topbar } from "@/components/shell/Topbar";
import { EmptyState } from "@/components/ui/EmptyState";

export default function HelpPage() {
  return (
    <>
      <Topbar title="Centro de ayuda" />
      <div className="px-4 py-8 sm:px-8">
        <EmptyState
          icon={HelpCircle}
          title="Centro de ayuda"
          description="Documentación y soporte para Atlas QA."
        />
      </div>
    </>
  );
}
