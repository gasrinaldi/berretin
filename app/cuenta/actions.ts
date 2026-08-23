"use server";

import { getCurrentUser } from "@/lib/auth-user";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sanitizeText } from "@/lib/contributions";
import { isValidAlias, isValidAvatarUrl, PROFILE_LOCATION_MAX, type ProfileRecord, type MyContributionRow } from "@/lib/community";

type Result = { ok: true } | { ok: false; error: string };

function unauthenticated(): { ok: false; error: string } {
  return { ok: false, error: "Iniciá sesión para continuar." };
}

function unavailable(): { ok: false; error: string } {
  return { ok: false, error: "No disponible en este momento. Probá más tarde." };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProfile(row: any): ProfileRecord {
  return { id: row.id, alias: row.alias, avatarUrl: row.avatar_url, location: row.location, reputation: row.reputation, createdAt: row.created_at };
}

export async function getMyProfile(): Promise<{ ok: true; profile: ProfileRecord | null } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return unauthenticated();

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return unavailable();
  }

  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (error) return { ok: false, error: "No pudimos cargar tu perfil." };
  return { ok: true, profile: data ? mapProfile(data) : null };
}

export async function createProfile(alias: string, location: string, avatarUrl: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return unauthenticated();

  const cleanAlias = alias.trim().toLowerCase();
  if (!isValidAlias(cleanAlias)) return { ok: false, error: "El alias debe tener 3 a 24 caracteres: minúsculas, números o guion bajo." };

  const cleanLocation = sanitizeText(location).slice(0, PROFILE_LOCATION_MAX);
  const cleanAvatar = avatarUrl.trim();
  if (cleanAvatar && !isValidAvatarUrl(cleanAvatar)) return { ok: false, error: "El avatar tiene que ser un link https:// válido." };

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return unavailable();
  }

  const { data: existing } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (existing) return { ok: false, error: "Ya tenés un perfil creado." };

  const { data: taken } = await supabase.from("profiles").select("id").eq("alias", cleanAlias).maybeSingle();
  if (taken) return { ok: false, error: "Ese alias ya está en uso." };

  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    alias: cleanAlias,
    location: cleanLocation || null,
    avatar_url: cleanAvatar || null,
  });

  if (error) return { ok: false, error: error.code === "23505" ? "Ese alias ya está en uso." : "No pudimos crear tu perfil." };
  return { ok: true };
}

export async function updateProfile(location: string, avatarUrl: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return unauthenticated();

  const cleanLocation = sanitizeText(location).slice(0, PROFILE_LOCATION_MAX);
  const cleanAvatar = avatarUrl.trim();
  if (cleanAvatar && !isValidAvatarUrl(cleanAvatar)) return { ok: false, error: "El avatar tiene que ser un link https:// válido." };

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return unavailable();
  }

  const { error } = await supabase
    .from("profiles")
    .update({ location: cleanLocation || null, avatar_url: cleanAvatar || null, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) return { ok: false, error: "No pudimos actualizar tu perfil." };
  return { ok: true };
}

export async function getMyContributions(): Promise<{ ok: true; rows: MyContributionRow[] } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return unauthenticated();

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return unavailable();
  }

  const { data, error } = await supabase
    .from("word_contributions")
    .select("id, word, word_slug, type, content, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return { ok: false, error: "No pudimos cargar tus aportes." };

  return {
    ok: true,
    rows: (data ?? []).map((r) => ({ id: r.id, word: r.word, wordSlug: r.word_slug, type: r.type, content: r.content, status: r.status, createdAt: r.created_at })),
  };
}

export async function signOutUser(): Promise<void> {
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}
