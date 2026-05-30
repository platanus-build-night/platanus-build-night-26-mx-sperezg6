import { NextResponse } from "next/server";
import { getLiveSpecs } from "@/lib/runs-data";

export const dynamic = "force-dynamic";

/** Polling endpoint for the /live multi-agent grid. */
export async function GET() {
  const specs = await getLiveSpecs();
  return NextResponse.json({ specs }, { headers: { "cache-control": "no-store" } });
}
