"use server";

import { getAdminUser } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { MAINTENANCE_MODE_KEY } from "@/lib/site-settings";

type Result = { ok: true; maintenanceMode: boolean } | { ok: false; error: string };

export async function getMaintenanceMode(): Promise<Result> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: "No autorizado." };

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return { ok: false, error: "No disponible en este momento." };
  }

  const { data, error } = await supabase.from("site_settings").select("value").eq("key", MAINTENANCE_MODE_KEY).maybeSingle();
  if (error) return { ok: false, error: "No pudimos leer el estado del sitio." };
  return { ok: true, maintenanceMode: data?.value === true };
}

// Único punto de escritura de maintenance_mode en todo el código (además
// del seed de la migración). getAdminUser() es la autoridad real acá —
// nunca se confía en nada que venga del cliente más allá del booleano que
// se quiere setear.
export async function setMaintenanceMode(nextValue: boolean): Promise<Result> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: "No autorizado." };

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return { ok: false, error: "No disponible en este momento." };
  }

  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: MAINTENANCE_MODE_KEY, value: nextValue, updated_at: new Date().toISOString(), updated_by: admin.id }, { onConflict: "key" });

  if (error) return { ok: false, error: "No pudimos actualizar el estado del sitio." };
  return { ok: true, maintenanceMode: nextValue };
}
