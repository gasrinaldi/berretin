import type { SupabaseClient } from "@supabase/supabase-js";

// Límite por IP-hash contra automatización masiva de votos (mismo patrón
// que contribuciones/reportes): independiente de si el votante está
// logueado o es anónimo, para que rotar de cuenta o de cookie no alcance
// para esquivarlo.
const VOTE_RATE_LIMIT_SECONDS = 2;
const VOTE_DAILY_LIMIT = 300;

export async function checkVoteRateLimit(
  supabase: SupabaseClient,
  table: "word_votes" | "contribution_votes",
  ipHash: string,
  recentColumn: "created_at" | "updated_at" = "created_at"
): Promise<string | null> {
  const sinceRecent = new Date(Date.now() - VOTE_RATE_LIMIT_SECONDS * 1000).toISOString();
  const { count: recentCount, error: recentError } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte(recentColumn, sinceRecent);
  if (!recentError && (recentCount ?? 0) > 0) {
    return "Esperá un momento antes de volver a votar.";
  }

  const sinceDay = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: dailyCount, error: dailyError } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", sinceDay);
  if (!dailyError && (dailyCount ?? 0) >= VOTE_DAILY_LIMIT) {
    return "Alcanzaste el límite de votos por hoy.";
  }

  return null;
}
