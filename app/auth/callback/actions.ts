"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

// Recibe el access_token/refresh_token que el magic link (flujo implícito)
// dejó en el hash de la URL y los usa para crear la sesión del lado del
// servidor: setSession() dispara el guardado de cookies vía el adapter de
// @supabase/ssr, igual que antes lo hacía exchangeCodeForSession() con el
// flujo PKCE. Así /cuenta (que lee la sesión con createSupabaseServerClient
// desde un Server Component) la ve inmediatamente después del redirect.
export async function establishSession(accessToken: string, refreshToken: string): Promise<Result> {
  if (!accessToken || !refreshToken) return { ok: false, error: "El enlace no es válido o ya expiró." };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "No disponible en este momento. Probá más tarde." };

  const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (error) return { ok: false, error: "El enlace no es válido o ya expiró." };

  return { ok: true };
}
