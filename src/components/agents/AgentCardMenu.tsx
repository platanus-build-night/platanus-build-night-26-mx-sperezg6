"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Play, Trash2 } from "lucide-react";
import { DropdownMenu, type DropdownItem } from "@/components/ui/DropdownMenu";
import { deleteAgentAction } from "@/lib/actions";

/** ⋯ menu on an agent card — run / open / delete without entering the detail. */
export function AgentCardMenu({ agentId, agentName }: { agentId: string; agentName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const items: DropdownItem[] = [
    { label: "Abrir", icon: Pencil, onClick: () => router.push(`/agents/${agentId}`) },
    { label: "Ejecutar", icon: Play, onClick: () => router.push(`/agents/${agentId}`) },
    "separator",
    {
      label: pending ? "Eliminando…" : "Eliminar",
      icon: Trash2,
      destructive: true,
      onClick: () => {
        if (!confirm(`¿Eliminar "${agentName}"? Se eliminará también su runtime.`)) return;
        startTransition(async () => {
          await deleteAgentAction(agentId);
          router.refresh();
        });
      },
    },
  ];

  return (
    <DropdownMenu
      align="end"
      items={items}
      trigger={
        <button
          type="button"
          aria-label="Opciones del agente"
          className="grid size-7 place-items-center rounded-md bg-ink/40 text-cream backdrop-blur-sm transition-colors hover:bg-ink/60"
        >
          <MoreHorizontal className="size-4" strokeWidth={1.75} />
        </button>
      }
    />
  );
}
