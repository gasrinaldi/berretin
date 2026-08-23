"use server";

import { getCurrentUser } from "@/lib/auth-user";
import { getSupabaseAdmin, CONTRIBUTIONS_BUCKET, CONTRIBUTIONS_AUDIO_BUCKET } from "@/lib/supabase-admin";
import { getEntryBySlug } from "@/lib/dictionary";
import { GALLERY_USO_TYPES, GALLERY_VE_TYPES, GALLERY_PAGE_SIZE, GALLERY_THUMB_TTL_SECONDS, GALLERY_FULL_TTL_SECONDS, type GalleryTab, type GalleryContribution, type GalleryPage } from "@/lib/gallery";

type Ok<T> = { ok: true } & T;
type Err = { ok: false; error: string };

function unavailable(): Err {
  return { ok: false, error: "No disponible en este momento." };
}

export async function getWordGallery(wordSlug: string, tab: GalleryTab, page: number): Promise<Ok<{ data: GalleryPage }> | Err> {
  const entry = getEntryBySlug(wordSlug);
  if (!entry) return { ok: false, error: "Palabra no encontrada." };

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return unavailable();
  }

  const types = tab === "uso" ? GALLERY_USO_TYPES : GALLERY_VE_TYPES;
  const safePage = Math.max(0, Math.floor(page) || 0);
  const start = safePage * GALLERY_PAGE_SIZE;

  const { data, count, error } = await supabase
    .from("word_contributions")
    // Selección explícita de columnas públicas: nunca email, moderation_note,
    // ip_hash ni las rutas privadas de storage (image_path/audio_path) —
    // solo thumbnail_path, que se resuelve a una URL firmada acá mismo y no
    // se devuelve como texto. user_id se pide para resolver el perfil
    // público del autor más abajo, pero nunca se incluye en la respuesta.
    .select("id, type, content, author_alias, location, decade, created_at, image_path, thumbnail_path, audio_path, user_id", { count: "exact" })
    .eq("word_id", entry.id)
    .eq("status", "approved")
    .in("type", types)
    .order("created_at", { ascending: false })
    .range(start, start + GALLERY_PAGE_SIZE - 1);

  if (error) return { ok: false, error: "No pudimos cargar los aportes." };

  const rows = data ?? [];

  // Aportes anónimos (sin user_id) quedan siempre sin link. Para el resto,
  // solo se linkea si esa cuenta efectivamente tiene un perfil público.
  const authorIds = [...new Set(rows.map((r) => r.user_id).filter((id): id is string => Boolean(id)))];
  const profileAliasByUserId = new Map<string, string>();
  if (authorIds.length > 0) {
    const { data: profileRows } = await supabase.from("profiles").select("id, alias").in("id", authorIds);
    profileRows?.forEach((p) => profileAliasByUserId.set(p.id, p.alias));
  }
  const thumbPaths = rows.map((r) => r.thumbnail_path).filter((p): p is string => Boolean(p));
  const signedMap = new Map<string, string>();
  if (thumbPaths.length > 0) {
    const { data: signed } = await supabase.storage.from(CONTRIBUTIONS_BUCKET).createSignedUrls(thumbPaths, GALLERY_THUMB_TTL_SECONDS);
    signed?.forEach((s) => {
      if (s.path && s.signedUrl) signedMap.set(s.path, s.signedUrl);
    });
  }

  const ids = rows.map((r) => r.id);
  const voteCounts = new Map<string, number>();
  let myVotedIds = new Set<string>();

  if (ids.length > 0) {
    const { data: votes } = await supabase.from("contribution_votes").select("contribution_id, user_id").in("contribution_id", ids);
    for (const v of votes ?? []) voteCounts.set(v.contribution_id, (voteCounts.get(v.contribution_id) ?? 0) + 1);

    const user = await getCurrentUser();
    if (user) {
      myVotedIds = new Set((votes ?? []).filter((v) => v.user_id === user.id).map((v) => v.contribution_id));
    }
  }

  const galleryRows: GalleryContribution[] = rows.map((r) => ({
    id: r.id,
    type: r.type,
    content: r.content,
    authorAlias: r.author_alias,
    authorProfileAlias: r.user_id ? (profileAliasByUserId.get(r.user_id) ?? null) : null,
    location: r.location,
    decade: r.decade,
    createdAt: r.created_at,
    hasImage: Boolean(r.image_path),
    hasAudio: Boolean(r.audio_path),
    thumbnailSignedUrl: r.thumbnail_path ? (signedMap.get(r.thumbnail_path) ?? null) : null,
    voteCount: voteCounts.get(r.id) ?? 0,
    myVote: myVotedIds.has(r.id),
  }));

  const total = count ?? 0;

  return { ok: true, data: { rows: galleryRows, total, hasMore: start + GALLERY_PAGE_SIZE < total } };
}

// Firma bajo pedido la imagen optimizada completa (no la miniatura) o el
// audio de un aporte — nunca se precargan: solo se llama cuando el
// usuario efectivamente pide verla/escucharla. Vuelve a chequear que el
// aporte esté aprobado, para que no se puedan adivinar IDs de aportes
// pendientes o rechazados y sacarles la URL firmada igual.
export async function getContributionMediaUrl(contributionId: string, kind: "image" | "audio"): Promise<Ok<{ url: string }> | Err> {
  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return unavailable();
  }

  const { data: contrib, error } = await supabase.from("word_contributions").select("status, image_path, audio_path").eq("id", contributionId).maybeSingle();
  if (error || !contrib || contrib.status !== "approved") return { ok: false, error: "Este aporte no está disponible." };

  if (kind === "image") {
    if (!contrib.image_path) return { ok: false, error: "Este aporte no tiene imagen." };
    const { data: signed, error: signError } = await supabase.storage.from(CONTRIBUTIONS_BUCKET).createSignedUrl(contrib.image_path, GALLERY_FULL_TTL_SECONDS);
    if (signError || !signed?.signedUrl) return { ok: false, error: "No pudimos generar el enlace." };
    return { ok: true, url: signed.signedUrl };
  }

  if (!contrib.audio_path) return { ok: false, error: "Este aporte no tiene audio." };
  const { data: signed, error: signError } = await supabase.storage.from(CONTRIBUTIONS_AUDIO_BUCKET).createSignedUrl(contrib.audio_path, GALLERY_FULL_TTL_SECONDS);
  if (signError || !signed?.signedUrl) return { ok: false, error: "No pudimos generar el enlace." };
  return { ok: true, url: signed.signedUrl };
}

export async function toggleContributionVote(contributionId: string): Promise<Ok<{ voted: boolean }> | Err> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Iniciá sesión para votar." };

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return unavailable();
  }

  const { data: contrib } = await supabase.from("word_contributions").select("status").eq("id", contributionId).maybeSingle();
  if (!contrib || contrib.status !== "approved") return { ok: false, error: "Este aporte no está disponible." };

  const { data: existing } = await supabase.from("contribution_votes").select("id").eq("user_id", user.id).eq("contribution_id", contributionId).maybeSingle();

  if (existing) {
    const { error } = await supabase.from("contribution_votes").delete().eq("id", existing.id);
    if (error) return { ok: false, error: "No pudimos actualizar tu voto." };
    return { ok: true, voted: false };
  }

  const { error } = await supabase.from("contribution_votes").insert({ user_id: user.id, contribution_id: contributionId });
  if (error) return { ok: false, error: "No pudimos actualizar tu voto." };
  return { ok: true, voted: true };
}
