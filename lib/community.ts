// Tipos y validaciones compartidas entre componentes cliente y server
// actions de la Etapa 4 (perfiles, votos, reportes). Sin secretos.

export type VoteValue = "si" | "poco" | "no";

export const VOTE_OPTIONS: { value: VoteValue; label: string }[] = [
  { value: "si", label: "Sí" },
  { value: "poco", label: "Poco" },
  { value: "no", label: "No" },
];

export function isVoteValue(value: string): value is VoteValue {
  return VOTE_OPTIONS.some((v) => v.value === value);
}

export type VoteSummary = { counts: Record<VoteValue, number>; total: number; myVote: VoteValue | null };

export type ReportReason = "wrong_definition" | "offensive" | "spam" | "other";

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "wrong_definition", label: "Definición incorrecta" },
  { value: "offensive", label: "Contenido ofensivo" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Otro motivo" },
];

export function isReportReason(value: string): value is ReportReason {
  return REPORT_REASONS.some((r) => r.value === value);
}

export type ReportFormState = { status: "idle" | "success" | "error"; error?: string };
export const initialReportState: ReportFormState = { status: "idle" };

export const ALIAS_MIN = 3;
export const ALIAS_MAX = 24;
const ALIAS_RE = /^[a-z0-9_]{3,24}$/;

export function isValidAlias(value: string): boolean {
  return ALIAS_RE.test(value);
}

export function isValidAvatarUrl(value: string): boolean {
  if (!value) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export const PROFILE_LOCATION_MAX = 120;
export const REPORT_COMMENT_MAX = 500;
export const REPUTATION_PER_APPROVAL = 10;

export type ProfileRecord = {
  id: string;
  alias: string;
  avatarUrl: string | null;
  location: string | null;
  reputation: number;
  createdAt: string;
};

export type ContributionStatus = "pending" | "approved" | "rejected";

export type MyContributionRow = {
  id: string;
  word: string;
  wordSlug: string;
  type: string;
  content: string;
  status: ContributionStatus;
  createdAt: string;
};
