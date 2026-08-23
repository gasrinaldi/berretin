"use server";

import { getAdminUser } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getEntryBySlug } from "@/lib/dictionary";
import { isArgentineRegion } from "@/lib/regions";

export type WordRegionRow = { id: string; wordSlug: string; word: string; region: string };
type ListResult = { ok: true; rows: WordRegionRow[] } | { ok: false; error: string };
type AssignResult = { ok: true; row: WordRegionRow } | { ok: false; error: string };
type Result = { ok: true } | { ok: false; error: string };

export async function listWordRegions(): Promise<ListResult> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: "No autorizado." };

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return { ok: false, error: "No disponible en este momento." };
  }

  const { data, error } = await supabase.from("word_regions").select("id, word_slug, word, region").order("created_at", { ascending: false });
  if (error) return { ok: false, error: "No pudimos cargar las regiones." };
  return { ok: true, rows: (data ?? []).map((r) => ({ id: r.id, wordSlug: r.word_slug, word: r.word, region: r.region })) };
}

// Asigna (o reemplaza) la región de una palabra. Nunca infiere la región:
// el admin la elige a mano de la lista fija de provincias, y la palabra
// tiene que existir realmente en el diccionario (se busca por slug exacto,
// el mismo que aparece en /palabra/[slug]).
export async function assignWordRegion(wordSlugRaw: string, region: string): Promise<AssignResult> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: "No autorizado." };

  const wordSlug = wordSlugRaw.trim().toLowerCase();
  if (!wordSlug) return { ok: false, error: "Ingresá el slug de una palabra." };

  const entry = getEntryBySlug(wordSlug);
  if (!entry) return { ok: false, error: "No encontramos esa palabra. Usá el slug exacto, por ejemplo \"bocha\" o \"a-babuchas\"." };

  if (!isArgentineRegion(region)) return { ok: false, error: "Elegí una provincia de la lista." };

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return { ok: false, error: "No disponible en este momento." };
  }

  const { data, error } = await supabase
    .from("word_regions")
    .upsert({ word_slug: entry.slug, word: entry.palabra, region }, { onConflict: "word_slug" })
    .select("id, word_slug, word, region")
    .single();

  if (error || !data) return { ok: false, error: "No pudimos guardar la región." };
  return { ok: true, row: { id: data.id, wordSlug: data.word_slug, word: data.word, region: data.region } };
}

export async function removeWordRegion(id: string): Promise<Result> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: "No autorizado." };

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return { ok: false, error: "No disponible en este momento." };
  }

  const { error } = await supabase.from("word_regions").delete().eq("id", id);
  if (error) return { ok: false, error: "No pudimos quitar la región." };
  return { ok: true };
}
