import { createClient } from "@supabase/supabase-js";

// Solo se importa desde archivos "use server" (contribute-actions.ts,
// admin/login/actions.ts, etc.): Next.js garantiza que esos archivos nunca
// se incluyen en el bundle del navegador, así que la service role key
// jamás llega al cliente.
export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Faltan las variables de entorno SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const CONTRIBUTIONS_BUCKET = "contribution-images";
export const CONTRIBUTIONS_AUDIO_BUCKET = "contribution-audio";
