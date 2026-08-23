"use server";

import { getAdminUser } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getEntryBySlug } from "@/lib/dictionary";
import { sanitizeText } from "@/lib/contributions";
import { mapChallengeRow, CHALLENGE_TITLE_MAX, CHALLENGE_DESCRIPTION_MAX, CHALLENGE_PERIOD_MAX, type ChallengeRecord } from "@/lib/challenges";

type ActionResult = { ok: true } | { ok: false; error: string };

function unauthorized(): { ok: false; error: string } {
  return { ok: false, error: "No autorizado." };
}

function unavailable(): { ok: false; error: string } {
  return { ok: false, error: "El panel no está disponible en este momento." };
}

export async function listChallenges(): Promise<{ ok: true; rows: ChallengeRecord[] } | { ok: false; error: string }> {
  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return unavailable();
  }

  const { data, error } = await supabase.from("monthly_challenges").select("*").order("created_at", { ascending: false }).limit(20);
  if (error) return { ok: false, error: "No pudimos cargar los desafíos." };
  return { ok: true, rows: (data ?? []).map(mapChallengeRow) };
}

export async function createChallenge(title: string, description: string, wordSlug: string, periodLabel: string): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  const cleanTitle = sanitizeText(title).slice(0, CHALLENGE_TITLE_MAX);
  const cleanDescription = sanitizeText(description).slice(0, CHALLENGE_DESCRIPTION_MAX);
  const cleanPeriod = sanitizeText(periodLabel).slice(0, CHALLENGE_PERIOD_MAX);
  const cleanSlug = wordSlug.trim().toLowerCase();

  if (!cleanTitle) return { ok: false, error: "El título no puede quedar vacío." };
  if (!cleanDescription) return { ok: false, error: "La descripción no puede quedar vacía." };
  if (!cleanPeriod) return { ok: false, error: "Indicá el período (ej. \"Septiembre 2026\")." };
  if (cleanSlug && !getEntryBySlug(cleanSlug)) return { ok: false, error: "Esa palabra no existe en el diccionario." };

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return unavailable();
  }

  // Solo un desafío activo a la vez: se desactivan los anteriores antes
  // de crear el nuevo.
  await supabase.from("monthly_challenges").update({ is_active: false }).eq("is_active", true);

  const { error } = await supabase.from("monthly_challenges").insert({
    title: cleanTitle,
    description: cleanDescription,
    word_slug: cleanSlug || null,
    period_label: cleanPeriod,
    is_active: true,
    created_by: admin.email,
  });

  if (error) return { ok: false, error: "No pudimos crear el desafío." };
  return { ok: true };
}

export async function deactivateChallenge(id: string): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return unavailable();
  }

  const { error } = await supabase.from("monthly_challenges").update({ is_active: false }).eq("id", id);
  if (error) return { ok: false, error: "No pudimos desactivar el desafío." };
  return { ok: true };
}
