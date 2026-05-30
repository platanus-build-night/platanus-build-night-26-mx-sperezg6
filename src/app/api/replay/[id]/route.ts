import { NextResponse } from "next/server";
import { gunzipSync } from "node:zlib";
import { ListObjectsV2Command, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Parse s3://bucket/prefix/ into { bucket, prefix }. */
function parseS3(uri: string) {
  const m = uri.replace(/^s3:\/\//, "").replace(/\/$/, "");
  const slash = m.indexOf("/");
  return { bucket: m.slice(0, slash), prefix: m.slice(slash + 1) };
}

async function streamToBuffer(body: unknown): Promise<Buffer> {
  const chunks: Buffer[] = [];
  // @ts-expect-error Node stream
  for await (const c of body) chunks.push(Buffer.from(c));
  return Buffer.concat(chunks);
}

/**
 * Returns the rrweb events for a run_spec's AgentCore session recording, ready
 * to feed to rrweb-player. Lists the session's batch-*.ndjson.gz objects in S3,
 * gunzips + parses each NDJSON line into an event, concatenated in order.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const sb = createServerSupabase();
  const { data: spec } = await sb
    .from("run_specs")
    .select("replay_s3_key")
    .eq("id", id)
    .maybeSingle();

  const key = spec?.replay_s3_key as string | undefined;
  if (!key || !key.startsWith("s3://")) {
    return NextResponse.json({ error: "no recording" }, { status: 404 });
  }

  const { bucket, prefix } = parseS3(key);
  const s3 = new S3Client({ region: process.env.AWS_REGION ?? "us-east-1" });

  const listed = await s3.send(
    new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }),
  );
  const batchKeys = (listed.Contents ?? [])
    .map((o) => o.Key as string)
    .filter((k) => k.endsWith(".ndjson.gz") && /batch/i.test(k))
    .sort();

  const events: unknown[] = [];
  for (const k of batchKeys) {
    const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: k }));
    const gz = await streamToBuffer(obj.Body);
    const text = gunzipSync(gz).toString("utf-8");
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (!t) continue;
      try {
        const ev = JSON.parse(t);
        if (ev && ev.type !== undefined && ev.timestamp !== undefined) events.push(ev);
      } catch {
        /* skip malformed line */
      }
    }
  }

  return NextResponse.json(
    { events },
    { headers: { "cache-control": "private, max-age=300" } },
  );
}
