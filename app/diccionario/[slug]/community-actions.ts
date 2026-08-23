"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth-user";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getEntryBySlug } from "@/lib/dictionary";
import { sanitizeText } from "@/lib/contributions";
import { isVoteValue, isReportReason, REPORT_COMMENT_MAX, type VoteValue, type VoteSummary, type ReportFormState } from "@/lib/community";

const REPORT_RATE_LIMIT_SECONDS = 30;
const REPORT_DAILY_LIMIT = 10;

async function getClientIpHash(): Promise<string | null> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0]!.trim() : headerList.get("x-real-ip");
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex");
}

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

  const user = await getCurrentUser();
  let myVote: VoteValue | null = null;
  if (user) {
    const { data: mine } = await supabase.from("word_votes").select("value").eq("word_id", entry.id).eq("user_id", user.id).maybeSingle();
    if (mine && isVoteValue(mine.value)) myVote = mine.value;
  }

  return { ok: true, data: { counts, total, myVote } };
}

export async function castVote(wordSlug: string, value: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Iniciá sesión para votar." };

  if (!isVoteValue(value)) return { ok: false, error: "Voto inválido." };

  const entry = getEntryBySlug(wordSlug);
  if (!entry) return { ok: false, error: "Palabra no encontrada." };

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return { ok: false, error: "No disponible en este momento." };
  }

  const { error } = await supabase
    .from("word_votes")
    .upsert({ user_id: user.id, word_id: entry.id, word_slug: entry.slug, value, updated_at: new Date().toISOString() }, { onConflict: "user_id,word_id" });

  if (error) return { ok: false, error: "No pudimos guardar tu voto." };
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
  return { status: "success" };
}
