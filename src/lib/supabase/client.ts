"use client";

import { createClient } from "@supabase/supabase-js";

/** Browser client (anon key). Used for reads + Realtime subscriptions. */
export function createBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local",
    );
  }
  return createClient(url, anonKey);
}
