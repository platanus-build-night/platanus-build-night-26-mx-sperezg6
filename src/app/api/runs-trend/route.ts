import { NextResponse } from "next/server";
import { getRunsTrend, type TrendPeriod } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

const VALID: TrendPeriod[] = ["1D", "1W", "1M", "3M", "1Y"];

/** Runs-over-time series for the dashboard chart, per period. */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams.get("period") as TrendPeriod | null;
  const period = p && VALID.includes(p) ? p : "1W";
  const trend = await getRunsTrend(period);
  return NextResponse.json(trend, { headers: { "cache-control": "no-store" } });
}
