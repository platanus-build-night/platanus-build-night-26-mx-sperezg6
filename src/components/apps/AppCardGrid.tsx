"use client";

import { AppWindow } from "lucide-react";
import { EntityCard, EntityCardGrid } from "@/components/ui/EntityCard";

export type AppCardData = {
  id: string;
  name: string;
  clientName: string;
  baseUrl: string;
  imageUrl: string | null;
  featureCount: number;
};

/** Strip protocol/trailing slash so the URL reads cleanly as a subtitle. */
function prettyUrl(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function AppCardGrid({ apps }: { apps: AppCardData[] }) {
  return (
    <EntityCardGrid>
      {apps.map((a) => (
        <EntityCard
          key={a.id}
          href={`/apps/${a.id}`}
          icon={AppWindow}
          title={a.name}
          subtitle={prettyUrl(a.baseUrl)}
          imageUrl={a.imageUrl}
          badges={["App"]}
          metric={{ value: String(a.featureCount), label: "funcs" }}
          meta={[
            { label: "Cliente", value: a.clientName },
            { label: "Funcionalidades", value: String(a.featureCount) },
          ]}
          cta="Ver app"
        />
      ))}
    </EntityCardGrid>
  );
}
