import { supabase } from "./supabaseClient";

// Field caps mirror the CHECK constraint on public.client_errors. Clipping here
// means an oversized stack trace is truncated rather than rejected outright.
const LIMITS = {
  message: 2000,
  source: 200,
  stack: 8000,
  url: 2000,
  userAgent: 500,
} as const;

// Client-side circuit breaker. The database has its own hourly limit, but this
// stops a render loop from firing hundreds of doomed requests in one session,
// and stops logError from recursing if reporting itself fails.
const SESSION_CAP = 20;
let sentThisSession = 0;

const clip = (value: string | undefined | null, max: number): string | null =>
  value ? value.slice(0, max) : null;

/**
 * Best-effort error reporting. Always logs to the console; additionally writes
 * to public.client_errors when a session exists (RLS permits authenticated
 * inserts only, so anonymous errors are console-only).
 *
 * This never throws and never rejects - reporting an error must not be able to
 * cause one.
 */
export async function logError(error: unknown, source?: string): Promise<void> {
  const message =
    error instanceof Error ? error.message : String(error ?? "unknown error");
  const stack = error instanceof Error ? error.stack : undefined;

  console.error(`[${source ?? "app"}]`, error);

  if (typeof window === "undefined") return;
  if (sentThisSession >= SESSION_CAP) return;
  sentThisSession++;

  try {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return;

    await supabase.from("client_errors").insert([
      {
        user_id: user.id,
        message: clip(message, LIMITS.message) ?? "unknown error",
        source: clip(source, LIMITS.source),
        stack: clip(stack, LIMITS.stack),
        url: clip(window.location.href, LIMITS.url),
        user_agent: clip(navigator.userAgent, LIMITS.userAgent),
      },
    ]);
  } catch {
    // Swallowed on purpose. If reporting is broken, the console entry above is
    // the fallback and the user's session carries on unaffected.
  }
}
