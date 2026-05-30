"use client";

import { Building2 } from "lucide-react";
import { EntityCard, EntityCardGrid } from "@/components/ui/EntityCard";

export type ClientCardData = {
  id: string;
  name: string;
  website: string | null;
  imageUrl: string | null;
  appCount: number;
  agentCount: number;
};

export function ClientCardGrid({ clients }: { clients: ClientCardData[] }) {
  return (
    <EntityCardGrid>
      {clients.map((c) => (
        <EntityCard
          key={c.id}
          href={`/clients/${c.id}`}
          icon={Building2}
          title={c.name}
          subtitle={c.website ?? undefined}
          monogram={c.name.slice(0, 2).toUpperCase()}
          imageUrl={c.imageUrl}
          metric={{ value: String(c.agentCount), label: "agentes" }}
          meta={[
            { label: "Aplicaciones", value: String(c.appCount) },
            { label: "Agentes", value: String(c.agentCount) },
          ]}
          cta="Ver cliente"
        />
      ))}
    </EntityCardGrid>
  );
}
