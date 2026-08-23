"use server";

import { getCurrentUser } from "@/lib/auth-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

// La sesión temporal ya quedó en cookies vía establishSession() (llamada
// desde /auth/callback antes de redirigir acá) — updateUser() la reutiliza,
// no hace falta pedir la contraseña vieja.
export async function updatePassword(password: string): Promise<Result> {
  if (password.length < 6) return { ok: false, error: "La contraseña tiene que tener al menos 6 caracteres." };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "El enlace no es válido o ya expiró. Pedí uno nuevo." };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "No disponible en este momento. Probá más tarde." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: "No pudimos actualizar la contraseña." };

  return { ok: true };
}
