import { NextResponse } from "next/server";
import { getRunPayload } from "@/lib/runs-data";

export const dynamic = "force-dynamic";

/** Polling endpoint for the run detail view (live step streaming sans Realtime). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const payload = await getRunPayload(id);
  if (!payload.run) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(payload, { headers: { "cache-control": "no-store" } });
}
