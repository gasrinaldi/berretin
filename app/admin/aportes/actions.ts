"use server";

import { getAdminUser } from "@/lib/admin-auth";
import { getSupabaseAdmin, CONTRIBUTIONS_BUCKET } from "@/lib/supabase-admin";
import { getEntryBySlug } from "@/lib/dictionary";
import { sanitizeText, CONTENT_MAX } from "@/lib/contributions";
import { REPUTATION_PER_APPROVAL } from "@/lib/community";
import {
  mapContributionRow,
  LIST_PAGE_SIZE,
  MODERATION_NOTE_MAX,
  BLOCK_REASON_MAX,
  THUMBNAIL_URL_TTL_SECONDS,
  ORIGINAL_URL_TTL_SECONDS,
  type ListFilters,
  type ListResult,
  type ContributionRow,
  type ActionResult,
} from "@/lib/admin-contributions";

type AdminSupabase = ReturnType<typeof getSupabaseAdmin>;

function unauthorized(): { ok: false; error: string } {
  return { ok: false, error: "No autorizado." };
}

function unavailable(): { ok: false; error: string } {
  return { ok: false, error: "El panel no está disponible en este momento." };
}

function getAdminClientOrNull(): AdminSupabase | null {
  try {
    return getSupabaseAdmin();
  } catch {
    return null;
  }
}

async function deleteContributionImages(supabase: AdminSupabase, imagePath: string | null, thumbnailPath: string | null) {
  const paths = [imagePath, thumbnailPath].filter((p): p is string => Boolean(p));
  if (paths.length === 0) return;
  await supabase.storage.from(CONTRIBUTIONS_BUCKET).remove(paths);
}

export async function listContributions(filters: ListFilters): Promise<{ ok: true; data: ListResult } | { ok: false; error: string }> {
  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  const supabase = getAdminClientOrNull();
  if (!supabase) return unavailable();

  const [pendingCount, approvedCount, rejectedCount] = await Promise.all([
    supabase.from("word_contributions").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("word_contributions").select("id", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("word_contributions").select("id", { count: "exact", head: true }).eq("status", "rejected"),
  ]);

  let query = supabase.from("word_contributions").select("*", { count: "exact" });

  if (filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.type !== "all") query = query.eq("type", filters.type);

  const word = filters.word.trim().replace(/[,()%_]/g, "");
  if (word) query = query.or(`word.ilike.%${word}%,word_slug.ilike.%${word}%`);
  if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom);
  if (filters.dateTo) query = query.lte("created_at", filters.dateTo);

  const page = Math.max(0, Math.floor(filters.page) || 0);
  const start = page * LIST_PAGE_SIZE;
  query = query.order("created_at", { ascending: false }).range(start, start + LIST_PAGE_SIZE - 1);

  const { data, count, error } = await query;
  if (error) return { ok: false, error: "No pudimos cargar los aportes." };

  const rows = (data ?? []).map(mapContributionRow);

  const thumbPaths = rows.map((r) => r.thumbnailPath).filter((p): p is string => Boolean(p));
  const signedMap = new Map<string, string>();
  if (thumbPaths.length > 0) {
    const { data: signed } = await supabase.storage.from(CONTRIBUTIONS_BUCKET).createSignedUrls(thumbPaths, THUMBNAIL_URL_TTL_SECONDS);
    signed?.forEach((s) => {
      if (s.path && s.signedUrl) signedMap.set(s.path, s.signedUrl);
    });
  }

  const rowsWithUrls: ContributionRow[] = rows.map((r) => ({
    ...r,
    thumbnailSignedUrl: r.thumbnailPath ? (signedMap.get(r.thumbnailPath) ?? null) : null,
    currentDefinition: r.type === "correction" || r.type === "alternative_meaning" ? (getEntryBySlug(r.wordSlug)?.definicion ?? null) : null,
  }));

  const total = count ?? 0;

  return {
    ok: true,
    data: {
      rows: rowsWithUrls,
      total,
      hasMore: start + LIST_PAGE_SIZE < total,
      counts: {
        pending: pendingCount.count ?? 0,
        approved: approvedCount.count ?? 0,
        rejected: rejectedCount.count ?? 0,
      },
    },
  };
}

export async function updateAndApprove(id: string, content: string, moderationNote: string): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  const trimmedContent = sanitizeText(content);
  if (trimmedContent.length < 1) return { ok: false, error: "El contenido no puede quedar vacío." };
  if (trimmedContent.length > CONTENT_MAX) return { ok: false, error: `El contenido no puede superar los ${CONTENT_MAX} caracteres.` };
  const note = sanitizeText(moderationNote).slice(0, MODERATION_NOTE_MAX);

  const supabase = getAdminClientOrNull();
  if (!supabase) return unavailable();

  // Se lee el estado previo para no sumar reputación dos veces si algo
  // reintenta aprobar un aporte que ya estaba aprobado.
  const { data: existing } = await supabase.from("word_contributions").select("status, user_id").eq("id", id).single();

  const { error } = await supabase
    .from("word_contributions")
    .update({ content: trimmedContent, status: "approved", moderation_note: note || null, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: "No pudimos guardar los cambios." };

  if (existing && existing.status !== "approved" && existing.user_id) {
    await supabase.rpc("increment_reputation", { profile_id: existing.user_id, amount: REPUTATION_PER_APPROVAL });
  }

  return { ok: true };
}

export async function rejectContribution(id: string, moderationNote: string): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  const supabase = getAdminClientOrNull();
  if (!supabase) return unavailable();

  const { data: existing, error: fetchError } = await supabase.from("word_contributions").select("image_path, thumbnail_path").eq("id", id).single();
  if (fetchError || !existing) return { ok: false, error: "No encontramos ese aporte." };

  await deleteContributionImages(supabase, existing.image_path, existing.thumbnail_path);

  const note = sanitizeText(moderationNote).slice(0, MODERATION_NOTE_MAX);
  const { error } = await supabase
    .from("word_contributions")
    .update({
      status: "rejected",
      moderation_note: note || null,
      image_path: null,
      thumbnail_path: null,
      image_size: null,
      thumbnail_size: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, error: "No pudimos guardar los cambios." };
  return { ok: true };
}

export async function saveModerationNote(id: string, moderationNote: string): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  const note = sanitizeText(moderationNote).slice(0, MODERATION_NOTE_MAX);

  const supabase = getAdminClientOrNull();
  if (!supabase) return unavailable();

  const { error } = await supabase
    .from("word_contributions")
    .update({ moderation_note: note || null, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: "No pudimos guardar la nota." };
  return { ok: true };
}

export async function blockSender(id: string, reason: string): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  const trimmedReason = sanitizeText(reason).slice(0, BLOCK_REASON_MAX);
  if (!trimmedReason) return { ok: false, error: "Contá brevemente el motivo del bloqueo." };

  const supabase = getAdminClientOrNull();
  if (!supabase) return unavailable();

  const { data: existing, error: fetchError } = await supabase
    .from("word_contributions")
    .select("ip_hash, email, image_path, thumbnail_path")
    .eq("id", id)
    .single();
  if (fetchError || !existing) return { ok: false, error: "No encontramos ese aporte." };
  if (!existing.ip_hash && !existing.email) return { ok: false, error: "Este aporte no tiene un remitente identificable para bloquear." };

  const { error: insertError } = await supabase.from("blocked_senders").insert({
    ip_hash: existing.ip_hash,
    email: existing.email ? existing.email.toLowerCase() : null,
    reason: trimmedReason,
    blocked_by: admin.email,
  });
  if (insertError) return { ok: false, error: "No pudimos registrar el bloqueo." };

  await deleteContributionImages(supabase, existing.image_path, existing.thumbnail_path);

  const { error: updateError } = await supabase
    .from("word_contributions")
    .update({
      status: "rejected",
      moderation_note: `Remitente bloqueado: ${trimmedReason}`,
      image_path: null,
      thumbnail_path: null,
      image_size: null,
      thumbnail_size: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (updateError) return { ok: false, error: "El bloqueo se registró, pero no pudimos actualizar el aporte." };

  return { ok: true };
}

export async function getOriginalImageUrl(id: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  const supabase = getAdminClientOrNull();
  if (!supabase) return unavailable();

  const { data: existing, error: fetchError } = await supabase.from("word_contributions").select("image_path").eq("id", id).single();
  if (fetchError || !existing?.image_path) return { ok: false, error: "Esta entrada no tiene una imagen original disponible." };

  const { data: signed, error: signError } = await supabase.storage.from(CONTRIBUTIONS_BUCKET).createSignedUrl(existing.image_path, ORIGINAL_URL_TTL_SECONDS);
  if (signError || !signed?.signedUrl) return { ok: false, error: "No pudimos generar el enlace." };

  return { ok: true, url: signed.signedUrl };
}

export type SenderHistoryRow = { id: string; word: string; type: string; status: string; createdAt: string };

export async function getSenderHistory(id: string): Promise<{ ok: true; rows: SenderHistoryRow[] } | { ok: false; error: string }> {
  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  const supabase = getAdminClientOrNull();
  if (!supabase) return unavailable();

  const { data: current, error: fetchError } = await supabase.from("word_contributions").select("ip_hash").eq("id", id).single();
  if (fetchError || !current?.ip_hash) return { ok: true, rows: [] };

  const { data, error } = await supabase
    .from("word_contributions")
    .select("id, word, type, status, created_at")
    .eq("ip_hash", current.ip_hash)
    .neq("id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) return { ok: false, error: "No pudimos cargar el historial del remitente." };

  return { ok: true, rows: (data ?? []).map((r) => ({ id: r.id, word: r.word, type: r.type, status: r.status, createdAt: r.created_at })) };
}

export async function signOutAdmin(): Promise<void> {
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}
