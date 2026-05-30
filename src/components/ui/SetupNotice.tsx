import { Database } from "lucide-react";

export function SetupNotice() {
  return (
    <div className="rounded-[var(--radius)] border border-dashed border-line bg-surface px-6 py-16 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full border border-line text-faint">
        <Database className="size-5" strokeWidth={1.5} />
      </span>
      <p className="mt-4 text-base font-medium">Conecta Supabase para continuar</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-mute">
        Aplica <code className="text-mono text-xs">supabase/migrations/0001_init.sql</code> y agrega{" "}
        <code className="text-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
        <code className="text-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> y{" "}
        <code className="text-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</code> a{" "}
        <code className="text-mono text-xs">.env.local</code>.
      </p>
    </div>
  );
}
