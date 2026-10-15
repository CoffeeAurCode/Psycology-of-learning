import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isConfigured = Boolean(url && key);

export const supabase = createClient(url ?? "http://localhost", key ?? "missing", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

/** Turn Supabase / Postgres errors into something a student can act on. */
export function friendlyError(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? String(e);
  const code = (e as { code?: string })?.code;
  if (code === "PGRST202" || /function .* does not exist|Could not find the function/i.test(msg))
    return "The database isn't set up yet. Run supabase/setup.sql in the Supabase SQL editor.";
  if (code === "23505") return "That name is taken. Try another.";
  if (/rate limit|too many/i.test(msg)) return "Too many attempts. Please wait a minute and try again.";
  if (/Token has expired or is invalid|otp/i.test(msg)) return "That code is wrong or has expired. Request a new one.";
  if (/Failed to fetch|NetworkError/i.test(msg)) return "You seem to be offline. Check your connection.";
  return msg;
}
