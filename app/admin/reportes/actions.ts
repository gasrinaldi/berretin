"use server";

import { getAdminUser } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { ReportReason } from "@/lib/community";

export type ReportStatus = "pending" | "reviewed" | "dismissed";

export type ReportRow = {
  id: string;
  targetType: "word" | "contribution";
  wordSlug: string | null;
  contributionId: string | null;
  // Contexto del aporte reportado, resuelto vía join — nunca se expone
  // reporter_user_id ni ip_hash: el reporte es anónimo también para el
  // admin, solo importa qué se reportó y por qué.
  contributionWord: string | null;
  contributionContent: string | null;
  reason: ReportReason;
  comment: string | null;
  status: ReportStatus;
  createdAt: string;
};

type ListResult = { ok: true; rows: ReportRow[] } | { ok: false; error: string };
type Result = { ok: true } | { ok: false; error: string };

export async function listReports(): Promise<ListResult> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: "No autorizado." };

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return { ok: false, error: "No disponible en este momento." };
  }

  const { data, error } = await supabase
    .from("reports")
    .select("id, target_type, word_slug, contribution_id, reason, comment, status, created_at")
    .order("created_at", { ascending: false });

  if (error) return { ok: false, error: "No pudimos cargar los reportes." };

  const rows = data ?? [];
  const contributionIds = [...new Set(rows.map((r) => r.contribution_id).filter((id): id is string => Boolean(id)))];
  const contributionById = new Map<string, { word_slug: string; content: string }>();
  if (contributionIds.length > 0) {
    const { data: contributions } = await supabase.from("word_contributions").select("id, word_slug, content").in("id", contributionIds);
    contributions?.forEach((c) => contributionById.set(c.id, { word_slug: c.word_slug, content: c.content }));
  }

  return {
    ok: true,
    rows: rows.map((r) => {
      const contrib = r.contribution_id ? contributionById.get(r.contribution_id) : undefined;
      return {
        id: r.id,
        targetType: r.target_type,
        wordSlug: r.word_slug,
        contributionId: r.contribution_id,
        contributionWord: contrib?.word_slug ?? null,
        contributionContent: contrib?.content ?? null,
        reason: r.reason,
        comment: r.comment,
        status: r.status,
        createdAt: r.created_at,
      };
    }),
  };
}

export async function setReportResolved(id: string, resolved: boolean): Promise<Result> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: "No autorizado." };

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return { ok: false, error: "No disponible en este momento." };
  }

  const { error } = await supabase
    .from("reports")
    .update({ status: resolved ? "reviewed" : "pending" })
    .eq("id", id);

  if (error) return { ok: false, error: "No pudimos actualizar el reporte." };
  return { ok: true };
}
