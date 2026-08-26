"use server";

import { getCurrentUser } from "@/lib/auth-user";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getClientIpHash } from "@/lib/client-ip";
import { getOrCreateAnonVoterHash, readAnonVoterHash } from "@/lib/anon-voter";
import { checkVoteRateLimit } from "@/lib/vote-rate-limit";
import { getEntryBySlug } from "@/lib/dictionary";
import { sanitizeText } from "@/lib/contributions";
import { notifyAdmin } from "@/lib/admin-notify";
import { isVoteValue, isReportReason, REPORT_REASONS, REPORT_COMMENT_MAX, type VoteValue, type VoteSummary, type ReportFormState } from "@/lib/community";

const REPORT_RATE_LIMIT_SECONDS = 30;
const REPORT_DAILY_LIMIT = 10;

export async function getWordVoteSummary(wordSlug: string): Promise<{ ok: true; data: VoteSummary } | { ok: false; error: string }> {
  const entry = getEntryBySlug(wordSlug);
  if (!entry) return { ok: false, error: "Palabra no encontrada." };

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return { ok: false, error: "No disponible en este momento." };
  }

  const { data, error } = await supabase.from("word_votes").select("value").eq("word_id", entry.id);
  if (error) return { ok: false, error: "No pudimos cargar los votos." };

  const counts: Record<VoteValue, number> = { si: 0, poco: 0, no: 0 };
  for (const row of data ?? []) {
    if (isVoteValue(row.value)) counts[row.value]++;
  }
  const total = (data ?? []).length;

  // Sin cuenta: se identifica por el hash de la cookie anónima si ya
  // existe (no se crea una acá — esto es solo lectura). Sin cookie
  // todavía = nunca votó, no hace falta ninguna consulta extra.
  const user = await getCurrentUser();
  const identityColumn = user ? "user_id" : "anon_id_hash";
  const identityValue = user ? user.id : await readAnonVoterHash();

  let myVote: VoteValue | null = null;
  if (identityValue) {
    const { data: mine } = await supabase.from("word_votes").select("value").eq("word_id", entry.id).eq(identityColumn, identityValue).maybeSingle();
    if (mine && isVoteValue(mine.value)) myVote = mine.value;
  }

  return { ok: true, data: { counts, total, myVote } };
}

export async function castVote(wordSlug: string, value: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isVoteValue(value)) return { ok: false, error: "Voto inválido." };

  const entry = getEntryBySlug(wordSlug);
  if (!entry) return { ok: false, error: "Palabra no encontrada." };

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return { ok: false, error: "No disponible en este momento." };
  }

  // Con cuenta: user_id (como siempre). Sin cuenta: anon_id_hash, con
  // cookie generada server-side si hace falta — nunca se confía en un id
  // que mande el cliente.
  const user = await getCurrentUser();
  const identityColumn = user ? "user_id" : "anon_id_hash";
  const identityValue = user ? user.id : await getOrCreateAnonVoterHash();

  const ipHash = await getClientIpHash();
  if (ipHash) {
    const limitError = await checkVoteRateLimit(supabase, "word_votes", ipHash, "updated_at");
    if (limitError) return { ok: false, error: limitError };
  }

  const { data: existing } = await supabase.from("word_votes").select("id").eq("word_id", entry.id).eq(identityColumn, identityValue).maybeSingle();

  const now = new Date().toISOString();
  if (existing) {
    const { error } = await supabase.from("word_votes").update({ value, ip_hash: ipHash, updated_at: now }).eq("id", existing.id);
    if (error) return { ok: false, error: "No pudimos guardar tu voto." };
    return { ok: true };
  }

  const { error } = await supabase.from("word_votes").insert({
    user_id: user?.id ?? null,
    anon_id_hash: user ? null : identityValue,
    word_id: entry.id,
    word_slug: entry.slug,
    value,
    ip_hash: ipHash,
    updated_at: now,
  });

  if (error) return { ok: false, error: "No pudimos guardar tu voto." };
  return { ok: true };
}

// Retirar el voto ("¿todavía se usa?"): a diferencia de "me sirvió"
// (contribution_votes), acá el voto no es un simple toggle de existencia
// — tiene un value obligatorio (si/poco/no) — así que retirarlo es una
// acción aparte de castVote, no una rama del mismo insert/update.
export async function removeVote(wordSlug: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const entry = getEntryBySlug(wordSlug);
  if (!entry) return { ok: false, error: "Palabra no encontrada." };

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return { ok: false, error: "No disponible en este momento." };
  }

  const user = await getCurrentUser();
  const identityColumn = user ? "user_id" : "anon_id_hash";
  const identityValue = user ? user.id : await readAnonVoterHash();
  if (!identityValue) return { ok: true }; // nunca votó (ni cuenta ni cookie): nada que retirar

  const { error } = await supabase.from("word_votes").delete().eq("word_id", entry.id).eq(identityColumn, identityValue);
  if (error) return { ok: false, error: "No pudimos retirar tu voto." };
  return { ok: true };
}

export async function submitReport(_prevState: ReportFormState, formData: FormData): Promise<ReportFormState> {
  const honeypot = formData.get("website");
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    return { status: "success" };
  }

  const wordSlug = String(formData.get("wordSlug") ?? "").trim();
  const entry = wordSlug ? getEntryBySlug(wordSlug) : undefined;
  if (!entry) return { status: "error", error: "No pudimos identificar la palabra." };

  const rawReason = String(formData.get("reason") ?? "");
  if (!isReportReason(rawReason)) return { status: "error", error: "Elegí un motivo válido." };

  // Si viene contributionId, el reporte apunta a ese aporte aprobado
  // puntual (galería, Etapa 5) en vez de a la palabra en general.
  const contributionId = String(formData.get("contributionId") ?? "").trim() || null;

  const comment = sanitizeText(String(formData.get("comment") ?? "")).slice(0, REPORT_COMMENT_MAX);

  const ipHash = await getClientIpHash();
  const user = await getCurrentUser();

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return { status: "error", error: "No disponible en este momento. Probá más tarde." };
  }

  if (ipHash) {
    const { count: recentCount, error: recentError } = await supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", new Date(Date.now() - REPORT_RATE_LIMIT_SECONDS * 1000).toISOString());
    if (!recentError && (recentCount ?? 0) > 0) {
      return { status: "error", error: "Ya enviaste un reporte hace muy poco. Esperá un momento." };
    }

    const { count: dailyCount, error: dailyError } = await supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    if (!dailyError && (dailyCount ?? 0) >= REPORT_DAILY_LIMIT) {
      return { status: "error", error: "Alcanzaste el límite de reportes por hoy." };
    }
  }

  const { error } = await supabase.from("reports").insert({
    target_type: contributionId ? "contribution" : "word",
    word_slug: entry.slug,
    contribution_id: contributionId,
    reason: rawReason,
    comment: comment || null,
    reporter_user_id: user?.id ?? null,
    ip_hash: ipHash,
  });

  if (error) return { status: "error", error: "No pudimos enviar el reporte." };

  // Recién acá, con el INSERT ya confirmado: ver el comentario equivalente
  // en submitContribution (contribute-actions.ts) y en admin-notify.ts.
  await notifyAdmin({
    kind: "report",
    word: entry.palabra,
    detail: REPORT_REASONS.find((r) => r.value === rawReason)?.label ?? rawReason,
    createdAt: new Date(),
  });

  return { status: "success" };
}
